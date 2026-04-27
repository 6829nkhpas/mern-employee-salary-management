import DataPegawai from './DataPegawaiModel.js';
import Overtime from './OvertimeModel.js';

DataPegawai.hasMany(Overtime, {
    foreignKey: 'worker_id',
    as: 'overtimeEntries'
});

Overtime.belongsTo(DataPegawai, {
    foreignKey: 'worker_id',
    as: 'pegawai'
});

export {
    DataPegawai,
    Overtime
};
