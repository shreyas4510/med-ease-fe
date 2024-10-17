import { BadRequestException, Body, Controller, Get, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { HospitalService } from './hospital.service';
import { DepartmentDto, HospitalDto, LoginDto, TokenDto } from "./hospital.dto";
import * as CryptoJS from 'crypto-js';
import { passwordRegex } from 'src/utils/constants';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('hospital')
export class HospitalController {
    private readonly secretKey = process.env.CRYPTO_SECRET_KEY;
    constructor(private readonly hospitalService: HospitalService) {}

    @HttpCode(201)
    @Post('register')
    async save( @Body() body: HospitalDto ): Promise<HospitalDto> {
        try {
            const decryptedBytes = CryptoJS.AES.decrypt(body.password, this.secretKey);
            const decryptedPassword = decryptedBytes.toString(CryptoJS.enc.Utf8);

            if (!passwordRegex.test(decryptedPassword)) {
              throw new BadRequestException('Password does not meet the required format');
            }
        
            const data = await this.hospitalService.save(body);
            return new HospitalDto(data);   
        } catch (error) {
            throw error;
        }
    }

    @HttpCode(200)
    @Post('login')
    async login( @Body() body: LoginDto ): Promise<TokenDto> {
        try {
            const data = await this.hospitalService.login(body);
            return data;
        } catch (error) {
            throw error;
        }
    }

    @HttpCode(200)
    @UseGuards(AuthGuard)
    @Post('departments')
    async addDepartments(
        @Request() req,
        @Body() body: DepartmentDto
    ): Promise<HospitalDto> {
        try {
            await this.hospitalService.addDepartments(req.user, body);
            return new HospitalDto({
                ...req.user,
                ...body
            });
        } catch (error) {
            throw error;
        }
    }

    @HttpCode(200)
    @Get()
    async findHospitals( @Body() body: Record<string, string> ): Promise<Array<string>> {
        try {
            const data = await this.hospitalService.findHospitals(body.key);
            return data;
        } catch (error) {
            throw error;
        }
    }
}
