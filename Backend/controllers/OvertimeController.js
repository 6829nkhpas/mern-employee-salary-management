import { Op, UniqueConstraintError } from 'sequelize';
import db from '../config/Database.js';
import { DataPegawai, Overtime } from '../models/index.js';

const MONTHLY_HOUR_LIMIT = 60;

const parseDateOnly = (value) => {
    if (typeof value !== 'string') {
        return null;
    }

    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

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

    return parsedDate;
};

const getMonthRange = (value) => {
    const parsedDate = parseDateOnly(value);

    if (!parsedDate) {
        return null;
    }

    const year = parsedDate.getFullYear();
    const month = parsedDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    const formatDateOnly = (dateValue) => {
        const yyyy = dateValue.getFullYear();
        const mm = String(dateValue.getMonth() + 1).padStart(2, '0');
        const dd = String(dateValue.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    return {
        startOfMonth: formatDateOnly(startOfMonth),
        endOfMonth: formatDateOnly(endOfMonth)
    };
};

export const getOvertimeValidationContext = async (req, res) => {
    const workerId = Number(req.query.worker_id);
    const { date } = req.query;
    const monthRange = getMonthRange(date);

    if (!Number.isInteger(workerId) || workerId <= 0) {
        return res.status(400).json({ msg: 'Worker tidak valid.' });
    }

    if (!monthRange) {
        return res.status(400).json({ msg: 'Tanggal lembur tidak valid.' });
    }

    try {
        const [existingEntry, monthlyHours] = await Promise.all([
            Overtime.findOne({
                where: {
                    worker_id: workerId,
                    date
                },
                attributes: ['id']
            }),
            Overtime.sum('hours', {
                where: {
                    worker_id: workerId,
                    date: {
                        [Op.between]: [monthRange.startOfMonth, monthRange.endOfMonth]
                    }
                }
            })
        ]);

        return res.status(200).json({
            hasDuplicate: Boolean(existingEntry),
            monthlyHours: Number(monthlyHours || 0)
        });
    } catch (error) {
        return res.status(500).json({ msg: error.message });
    }
};

export const createOvertime = async (req, res) => {
    const { worker_id, date, hours, reason } = req.validatedOvertime;
    const monthRange = getMonthRange(date);

    if (!monthRange) {
        return res.status(400).json({ msg: 'Tanggal lembur tidak valid.' });
    }

    const transaction = await db.transaction();

    try {
        const worker = await DataPegawai.findByPk(worker_id, {
            attributes: ['id', 'nama_pegawai'],
            transaction
        });

        if (!worker) {
            await transaction.rollback();
            return res.status(400).json({ msg: 'Pegawai tidak ditemukan.' });
        }

        const duplicateEntry = await Overtime.findOne({
            where: {
                worker_id,
                date
            },
            attributes: ['id'],
            transaction
        });

        if (duplicateEntry) {
            await transaction.rollback();
            return res.status(400).json({ msg: 'Data lembur untuk pegawai dan tanggal tersebut sudah ada.' });
        }

        const monthlyHours = await Overtime.sum('hours', {
            where: {
                worker_id,
                date: {
                    [Op.between]: [monthRange.startOfMonth, monthRange.endOfMonth]
                }
            },
            transaction
        });

        const normalizedMonthlyHours = Number(monthlyHours || 0);

        if (normalizedMonthlyHours + hours > MONTHLY_HOUR_LIMIT) {
            await transaction.rollback();
            return res.status(400).json({
                msg: 'Total jam lembur bulanan tidak boleh melebihi 60 jam.'
            });
        }

        const overtime = await Overtime.create({
            worker_id,
            date,
            hours,
            reason
        }, {
            transaction
        });

        await transaction.commit();

        return res.status(201).json({
            msg: 'Data lembur berhasil disimpan.',
            data: overtime
        });
    } catch (error) {
        await transaction.rollback();

        if (error instanceof UniqueConstraintError) {
            return res.status(400).json({ msg: 'Data lembur untuk pegawai dan tanggal tersebut sudah ada.' });
        }

        return res.status(500).json({ msg: error.message });
    }
};
