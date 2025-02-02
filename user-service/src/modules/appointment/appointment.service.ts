import { ConflictException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAppointmentDto } from './appointment.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Appointment, Patient } from './appointment.schema';
import { Model } from 'mongoose';
import { Doctor } from '../doctor/doctor.schema';
import { Hospital } from '../hospital/hospital.schema';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class AppointmentService {

    constructor(
        @InjectModel(Patient.name) private patientModel: Model<Patient>,
        @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
        @InjectModel(Doctor.name) private doctorModel: Model<Doctor>,
        @InjectModel(Hospital.name) private hospitalModel: Model<Hospital>,
        @Inject(forwardRef(() => KafkaService)) private kafkaService: KafkaService
    ) { }

    async bookAppointment(body: CreateAppointmentDto): Promise<Record<string, string>> {
        const { name, age, contact, email, city, hospital, doctor, appointmentDate, slot } = body;

        try {
            const doctorData = await this.doctorModel.findById(doctor);
            const hospitalData = await this.hospitalModel.findById(hospital);

            if (!doctorData || !hospitalData) {
                throw new NotFoundException('Doctor or Hospital not found.');
            }

            let patient = await this.patientModel.findOne({ email });
            if (!patient) {
                patient = new this.patientModel({
                    name,
                    age,
                    contact,
                    email,
                    city
                });
                await patient.save();
            }

            const existingAppointment = await this.appointmentModel.findOne({
                patientId: patient._id,
                doctorId: doctor,
                hospitalId: hospital,
                appointmentDate,
                slot,
            });

            if (existingAppointment) {
                throw new ConflictException('Appointment already exists for this time slot.');
            }

            const appointment = new this.appointmentModel({
                patientId: patient._id,
                doctorId: doctor,
                hospitalId: hospital,
                appointmentDate,
                slot,
            });
            await appointment.save();

            const message = {
                slotId: slot,
                patientId: patient._id,
                appointmentId: appointment._id,
                doctorId: doctorData._id,
                patientName: patient.name,
                doctorName: doctorData.name,
                hospitalName: hospitalData.name,
                patientEmail: patient.email,
                patientContact: patient.contact,
                hospitalAddress: `${hospitalData.city}, ${hospitalData.state} - ${hospitalData.zipCode}`,
            };

            await this.kafkaService.sendMessage(
                process.env.KAFKA_USER_TOPIC,
                JSON.stringify({
                    operation: 'APPOINTMENT_BOOK',
                    data: message
                })
            );

            return {
                status: 'processing',
                message: 'Your appointment is currently under process. You will be notified once it is successfully booked or if there is an issue.',
            };
        } catch (error) {
            throw error;
        }
    }

    async processPostAppointment(payload): Promise<void> {
        try {
            const { doctorId, patientId, appointmentId, rating } = payload;
            const appointment = await this.appointmentModel.findById(appointmentId);
            if (!appointment) {
                throw new NotFoundException(`Appointment not found for ${appointmentId}`);
            }
            appointment.rating = rating;
            appointment.status = 'DONE';
            await appointment.save();

            const doctor = await this.doctorModel.findById(doctorId);
            if (!doctor) {
                throw new NotFoundException(`Doctor not found ${doctorId}`);
            }
            
            const totalRating = doctor.patientServed * doctor.rating;

            doctor.patientServed += 1;
            const newTotalRating = totalRating + Number(rating);

            doctor.rating = newTotalRating / doctor.patientServed;
            await doctor.save();
            console.log('Appointment rated and records updated successfully');
        } catch (error) {
            console.error('Failed to update appointment rating', error.message);
            throw error;
        }
    }
}
