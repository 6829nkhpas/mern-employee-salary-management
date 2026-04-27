import { Sequelize } from 'sequelize';
import db from '../config/Database.js';

const { DataTypes } = Sequelize;

const Overtime = db.define('overtime', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    worker_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'data_pegawai',
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    hours: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    freezeTableName: true,
    indexes: [
        {
            unique: true,
            fields: ['worker_id', 'date']
        }
    ]
});

export default Overtime;
