import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Layout from '../../../../layout';
import { Breadcrumb } from '../../../../components';
import { getMe } from '../../../../config/redux/action';

const API_BASE_URL = 'http://localhost:5000';
const MAX_PAST_DAYS = 7;
const MAX_DAILY_HOURS = 6;
const MAX_MONTHLY_HOURS = 60;

const initialFormState = {
    worker_id: '',
    date: '',
    hours: '',
    reason: ''
};

const initialValidationContext = {
    hasDuplicate: false,
    monthlyHours: 0
};

const formatDateForDisplay = (dateValue) => {
    const day = String(dateValue.getDate()).padStart(2, '0');
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const year = dateValue.getFullYear();
    return `${day}/${month}/${year}`;
};

const parseDisplayDate = (value) => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    const match = trimmedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (!match) {
        return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const parsedDate = new Date(year, month - 1, day);

    if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.getFullYear() !== year ||
        parsedDate.getMonth() !== month - 1 ||
        parsedDate.getDate() !== day
    ) {
        return null;
    }

    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return {
        date: parsedDate,
        iso: isoDate
    };
};

const DataOvertime = () => {
    const [formData, setFormData] = useState(initialFormState);
    const [employees, setEmployees] = useState([]);
    const [errors, setErrors] = useState({});
    const [validationContext, setValidationContext] = useState(initialValidationContext);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCheckingValidation, setIsCheckingValidation] = useState(false);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isError, user } = useSelector((state) => state.auth);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minimumDate = new Date(today);
    minimumDate.setDate(minimumDate.getDate() - MAX_PAST_DAYS);

    const resetFieldError = (fieldName) => {
        setErrors((currentErrors) => ({
            ...currentErrors,
            [fieldName]: ''
        }));
    };

    const fetchEmployees = async () => {
        setIsLoadingEmployees(true);

        try {
            const response = await axios.get(`${API_BASE_URL}/data_pegawai`);
            const sortedEmployees = [...response.data].sort((leftEmployee, rightEmployee) =>
                leftEmployee.nama_pegawai.localeCompare(rightEmployee.nama_pegawai)
            );
            setEmployees(sortedEmployees);
            setErrors((currentErrors) => ({
                ...currentErrors,
                form: ''
            }));
        } catch (error) {
            setErrors({
                form: error.response?.data?.msg || 'Data pegawai gagal dimuat.'
            });
        } finally {
            setIsLoadingEmployees(false);
        }
    };

    const fetchValidationContext = async (workerId, isoDate) => {
        setIsCheckingValidation(true);

        try {
            const response = await axios.get(`${API_BASE_URL}/api/overtime/check`, {
                params: {
                    worker_id: workerId,
                    date: isoDate
                }
            });

            setValidationContext({
                hasDuplicate: response.data.hasDuplicate,
                monthlyHours: Number(response.data.monthlyHours || 0)
            });
            setErrors((currentErrors) => ({
                ...currentErrors,
                form: ''
            }));
        } catch (error) {
            setValidationContext(initialValidationContext);
            setErrors((currentErrors) => ({
                ...currentErrors,
                form: error.response?.data?.msg || 'Validasi lembur tidak dapat diproses saat ini.'
            }));
        } finally {
            setIsCheckingValidation(false);
        }
    };

    const validateForm = () => {
        const nextErrors = {};
        const parsedDate = parseDisplayDate(formData.date);
        const normalizedHours = Number(formData.hours);
        const normalizedReason = formData.reason.trim();

        if (!formData.worker_id) {
            nextErrors.worker_id = 'Worker wajib dipilih.';
        } else if (!Number.isInteger(Number(formData.worker_id)) || Number(formData.worker_id) <= 0) {
            nextErrors.worker_id = 'Worker tidak valid.';
        }

        if (!formData.date) {
            nextErrors.date = 'Tanggal lembur wajib diisi.';
        } else if (!parsedDate) {
            nextErrors.date = 'Tanggal lembur harus memakai format DD/MM/YYYY yang valid.';
        } else if (parsedDate.date > today) {
            nextErrors.date = 'Tanggal lembur tidak boleh di masa depan.';
        } else if (parsedDate.date < minimumDate) {
            nextErrors.date = `Tanggal lembur harus antara ${formatDateForDisplay(minimumDate)} dan ${formatDateForDisplay(today)}.`;
        } else if (validationContext.hasDuplicate) {
            nextErrors.date = 'Data lembur untuk pegawai dan tanggal tersebut sudah ada.';
        }

        if (!formData.hours) {
            nextErrors.hours = 'Jam lembur wajib diisi.';
        } else if (!Number.isInteger(normalizedHours)) {
            nextErrors.hours = 'Jam lembur harus berupa bilangan bulat.';
        } else if (normalizedHours < 1 || normalizedHours > MAX_DAILY_HOURS) {
            nextErrors.hours = 'Jam lembur harus di antara 1 sampai 6 jam.';
        } else if (validationContext.monthlyHours + normalizedHours > MAX_MONTHLY_HOURS) {
            nextErrors.hours = 'Total jam lembur bulanan tidak boleh melebihi 60 jam.';
        }

        if (!normalizedReason) {
            nextErrors.reason = 'Alasan lembur wajib diisi.';
        } else if (normalizedReason.length < 10) {
            nextErrors.reason = 'Alasan lembur minimal 10 karakter.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        if (name === 'date') {
            const digitsOnly = value.replace(/\D/g, '').slice(0, 8);
            let formattedValue = digitsOnly;

            if (digitsOnly.length > 2) {
                formattedValue = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
            }

            if (digitsOnly.length > 4) {
                formattedValue = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`;
            }

            setFormData((currentFormData) => ({
                ...currentFormData,
                date: formattedValue
            }));
            resetFieldError(name);
            return;
        }

        setFormData((currentFormData) => ({
            ...currentFormData,
            [name]: value
        }));
        resetFieldError(name);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isCheckingValidation) {
            setErrors((currentErrors) => ({
                ...currentErrors,
                form: 'Validasi lembur masih diproses. Silakan tunggu sebentar.'
            }));
            return;
        }

        if (!validateForm()) {
            return;
        }

        const parsedDate = parseDisplayDate(formData.date);

        if (!parsedDate) {
            setErrors((currentErrors) => ({
                ...currentErrors,
                date: 'Tanggal lembur harus memakai format DD/MM/YYYY yang valid.'
            }));
            return;
        }

        setIsSubmitting(true);

        try {
            await axios.post(`${API_BASE_URL}/api/overtime`, {
                worker_id: Number(formData.worker_id),
                date: parsedDate.iso,
                hours: Number(formData.hours),
                reason: formData.reason.trim()
            });

            setFormData(initialFormState);
            setValidationContext(initialValidationContext);
            setErrors({});

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Data lembur berhasil disimpan.',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (error) {
            const responseErrors = error.response?.data?.errors;
            const message = error.response?.data?.msg || 'Data lembur gagal disimpan.';

            if (responseErrors) {
                setErrors(responseErrors);
            } else if (message.includes('tanggal tersebut sudah ada')) {
                setErrors((currentErrors) => ({
                    ...currentErrors,
                    date: message
                }));
            } else if (message.includes('60 jam')) {
                setErrors((currentErrors) => ({
                    ...currentErrors,
                    hours: message
                }));
            } else if (message.includes('Pegawai')) {
                setErrors((currentErrors) => ({
                    ...currentErrors,
                    worker_id: message
                }));
            } else {
                setErrors((currentErrors) => ({
                    ...currentErrors,
                    form: message
                }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        dispatch(getMe());
        fetchEmployees();
    }, [dispatch]);

    useEffect(() => {
        if (isError) {
            navigate('/login');
        }

        if (user && user.hak_akses !== 'admin') {
            navigate('/dashboard');
        }
    }, [isError, navigate, user]);

    useEffect(() => {
        const parsedDate = parseDisplayDate(formData.date);

        if (!formData.worker_id || !parsedDate) {
            setValidationContext(initialValidationContext);
            setIsCheckingValidation(false);
            return;
        }

        fetchValidationContext(formData.worker_id, parsedDate.iso);
    }, [formData.worker_id, formData.date]);

    return (
        <Layout>
            <Breadcrumb pageName='Form Data Lembur' />

            <div className='rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark'>
                <div className='border-b border-stroke py-4 px-6.5 dark:border-strokedark'>
                    <h3 className='font-medium text-black dark:text-white'>Input Lembur Pegawai</h3>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className='p-6.5'>
                        <div className='mb-4.5'>
                            <label className='mb-2.5 block text-black dark:text-white'>
                                Worker <span className='text-meta-1'>*</span>
                            </label>
                            <select
                                name='worker_id'
                                value={formData.worker_id}
                                onChange={handleInputChange}
                                className='w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary'
                                disabled={isLoadingEmployees}
                            >
                                <option value=''>
                                    {isLoadingEmployees ? 'Memuat data pegawai...' : 'Pilih pegawai'}
                                </option>
                                {employees.map((employee) => (
                                    <option key={employee.id} value={employee.id}>
                                        {employee.nama_pegawai} - {employee.nik}
                                    </option>
                                ))}
                            </select>
                            {errors.worker_id && <p className='mt-2 text-sm text-danger'>{errors.worker_id}</p>}
                        </div>

                        <div className='mb-4.5'>
                            <label className='mb-2.5 block text-black dark:text-white'>
                                Tanggal Lembur <span className='text-meta-1'>*</span>
                            </label>
                            <input
                                type='text'
                                name='date'
                                value={formData.date}
                                onChange={handleInputChange}
                                placeholder='DD/MM/YYYY'
                                className='w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary'
                            />
                            <p className='mt-2 text-sm text-body-color dark:text-bodydark1'>
                                Rentang tanggal yang diperbolehkan: {formatDateForDisplay(minimumDate)} - {formatDateForDisplay(today)}
                            </p>
                            {errors.date && <p className='mt-2 text-sm text-danger'>{errors.date}</p>}
                        </div>

                        <div className='mb-4.5'>
                            <label className='mb-2.5 block text-black dark:text-white'>
                                Jam Lembur <span className='text-meta-1'>*</span>
                            </label>
                            <input
                                type='number'
                                name='hours'
                                min='1'
                                max='6'
                                step='1'
                                value={formData.hours}
                                onChange={handleInputChange}
                                placeholder='Masukkan jumlah jam lembur'
                                className='w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary'
                            />
                            <p className='mt-2 text-sm text-body-color dark:text-bodydark1'>
                                Total lembur bulan berjalan saat ini: {validationContext.monthlyHours} jam.
                            </p>
                            {errors.hours && <p className='mt-2 text-sm text-danger'>{errors.hours}</p>}
                        </div>

                        <div className='mb-6'>
                            <label className='mb-2.5 block text-black dark:text-white'>
                                Alasan Lembur <span className='text-meta-1'>*</span>
                            </label>
                            <textarea
                                name='reason'
                                rows='4'
                                value={formData.reason}
                                onChange={handleInputChange}
                                placeholder='Masukkan alasan lembur minimal 10 karakter'
                                className='w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary'
                            />
                            {errors.reason && <p className='mt-2 text-sm text-danger'>{errors.reason}</p>}
                        </div>

                        {errors.form && <p className='mb-4 text-sm text-danger'>{errors.form}</p>}

                        <div className='flex flex-col gap-3 md:flex-row'>
                            <button
                                type='submit'
                                disabled={isSubmitting || isCheckingValidation}
                                className='inline-flex items-center justify-center gap-2 rounded-md bg-meta-3 py-2 px-10 text-center font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
                            >
                                {isSubmitting ? 'Menyimpan...' : isCheckingValidation ? 'Memvalidasi...' : 'Simpan Lembur'}
                            </button>
                            <button
                                type='button'
                                onClick={() => {
                                    setFormData(initialFormState);
                                    setErrors({});
                                    setValidationContext(initialValidationContext);
                                }}
                                className='inline-flex items-center justify-center gap-2 rounded-md bg-danger py-2 px-10 text-center font-medium text-white hover:bg-opacity-90'
                            >
                                Reset Form
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default DataOvertime;
