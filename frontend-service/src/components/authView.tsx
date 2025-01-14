import { Card, CardContent } from "@mui/material";
import { useEffect, useState } from "react";
import { formDataType, TProps } from "./types/authView";
import Input from "./input";
import Button from "./button";
import { ErrorMessage, Form, Formik } from "formik";
import CustomSelect from "./select";
import CustomDatePicker from "./datePicker";
import moment from "moment";

const AuthView = ({
    title,
    top,
    formData,
    handleReset,
    validationSchema,
    initialValues,
    handleSubmit,
    handleLoginState = () => { },
    loginState
}: TProps) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const element = document.getElementById('register-hospital-card');
            const rect = element?.getBoundingClientRect();
            if (rect && rect.top < window.innerHeight && rect.bottom >= 0) {
                setIsVisible(true);
                window.removeEventListener('scroll', handleScroll);
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const InputView = (
        obj: formDataType,
        setFieldValue: (name: string, option: string) => void,
        values: Record<string, string>
    ) => {
        switch (obj.type) {
            case 'select':
                return (
                    <CustomSelect
                        name={obj.name}
                        options={obj.options as []}
                        setFieldValue={(name, options) => {
                            setFieldValue(name, options);
                            if (typeof obj.onChange === 'function') {
                                obj.onChange(options, values)
                            }
                        }}
                        onSearch={obj.onSearch}
                    />
                )
            case 'date':
                return (
                    <CustomDatePicker
                        name={obj.name}
                        label={''}
                        minDate={moment().add(1, 'day').toISOString()}
                        setFieldValue={(name, options) => {
                            setFieldValue(name, options);
                            if (typeof obj.onChange === 'function') {
                                obj.onChange(options, values)
                            }
                        }}
                    />
                )
            default:
                return <Input name={obj.name} type={obj.type} placeholder={obj.label} />
        }
    }

    return (
        <div className="relative h-full">
            <div className="bg-custom-gradient h-custom-25 absolute right-0 left-0 top-0">
                <div
                    className="cursor-pointer px-16 my-5 text-start font-poppins text-3xl text-white"
                    onClick={handleReset}
                >MedEase</div>
                <p className="font-poppins my-4 font-bold text-4xl text-white">{title}</p>
            </div>
            <Card
                id='register-hospital-card'
                className={
                    `absolute left-0 right-0 ${top} mt-32 mx-auto !shadow-custom ` +
                    `transition-opacity duration-1000 ${isVisible ? 'animate-fadeIn' : 'opacity-0'}`
                }
                sx={{ maxWidth: '40rem' }}
            >
                <CardContent>
                    {
                        title.toLowerCase() === 'sign in' && (
                            <div className="w-full flex mb-4 !shadow-custom">
                                <div
                                    className={`w-full ${loginState === 'hospital' ? 'text-white bg-custom-gradient' : 'border border-secondary'} py-3 font-medium cursor-pointer`}
                                    onClick={() => handleLoginState('hospital')}
                                >Hospital</div>
                                <div
                                    className={`w-full ${loginState === 'doctor' ? 'text-white bg-custom-gradient' : 'border border-secondary'} py-3 font-medium cursor-pointer`}
                                    onClick={() => handleLoginState('doctor')}
                                >Doctor</div>
                            </div>
                        )
                    }
                    <Formik
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        onSubmit={handleSubmit}
                    >
                        {({ values, setFieldValue, isSubmitting, dirty, isValid, errors }) => {
                            return <Form className="grid grid-cols-2 gap-4" >
                                {
                                    formData.map((item, index) => (
                                        <div className={item.className} key={`auth-form-${item.label}-${index}`}>
                                            <label className="text-start text-blue-500 font-medium">{item.label}</label>
                                            {InputView(item, setFieldValue, values)}
                                            <ErrorMessage
                                                name={item.name}
                                                component="div"
                                                className="text-start text-red-500 text-xs"
                                            />
                                        </div>
                                    ))
                                }
                                <Button
                                    disabled={isSubmitting || !isValid || !dirty}
                                    type="submit"
                                    className="mx-auto col-span-2 text-white bg-blue-500"
                                >Submit</Button>
                            </Form>
                        }}
                    </Formik>
                </CardContent>
            </Card>
        </div>
    )
}

export default AuthView;