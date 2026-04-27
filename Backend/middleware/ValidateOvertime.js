const HOURS_MIN = 1;
const HOURS_MAX = 6;
const MAX_PAST_DAYS = 7;

const parseDateOnly = (value) => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    const match = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const parsedDate = new Date(year, month - 1, day);

    if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.getFullYear() !== year ||
        parsedDate.getMonth() !== month - 1 ||
        parsedDate.getDate() !== day
    ) {
        return null;
    }

    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate;
};

export const validateOvertimePayload = (req, res, next) => {
    const { worker_id, date, hours, reason } = req.body;
    const nextErrors = {};
    const normalizedWorkerId = Number(worker_id);
    const normalizedHours = Number(hours);
    const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
    const parsedDate = parseDateOnly(date);

    if (worker_id === undefined || worker_id === null || worker_id === '') {
        nextErrors.worker_id = 'Worker wajib dipilih.';
    } else if (!Number.isInteger(normalizedWorkerId) || normalizedWorkerId <= 0) {
        nextErrors.worker_id = 'Worker tidak valid.';
    }

    if (!date) {
        nextErrors.date = 'Tanggal lembur wajib diisi.';
    } else if (!parsedDate) {
        nextErrors.date = 'Tanggal lembur harus menggunakan format YYYY-MM-DD yang valid.';
    } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const minimumDate = new Date(today);
        minimumDate.setDate(minimumDate.getDate() - MAX_PAST_DAYS);

        if (parsedDate > today) {
            nextErrors.date = 'Tanggal lembur tidak boleh di masa depan.';
        } else if (parsedDate < minimumDate) {
            nextErrors.date = 'Tanggal lembur tidak boleh lebih dari 7 hari ke belakang.';
        }
    }

    if (hours === undefined || hours === null || hours === '') {
        nextErrors.hours = 'Jam lembur wajib diisi.';
    } else if (!Number.isInteger(normalizedHours)) {
        nextErrors.hours = 'Jam lembur harus berupa bilangan bulat.';
    } else if (normalizedHours < HOURS_MIN || normalizedHours > HOURS_MAX) {
        nextErrors.hours = 'Jam lembur harus di antara 1 sampai 6 jam.';
    }

    if (!normalizedReason) {
        nextErrors.reason = 'Alasan lembur wajib diisi.';
    } else if (normalizedReason.length < 10) {
        nextErrors.reason = 'Alasan lembur minimal 10 karakter.';
    }

    if (Object.keys(nextErrors).length > 0) {
        return res.status(400).json({
            msg: 'Validasi lembur gagal.',
            errors: nextErrors
        });
    }

    req.validatedOvertime = {
        worker_id: normalizedWorkerId,
        date: date.trim(),
        hours: normalizedHours,
        reason: normalizedReason
    };

    return next();
};
