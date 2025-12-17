import { DataTypes } from 'sequelize';

let models = {};

export function defineModels(sequelize) {
  const User = sequelize.define('User', {
    phone: { type: DataTypes.STRING, primaryKey: true },
    lat: { type: DataTypes.FLOAT, allowNull: true },
    lon: { type: DataTypes.FLOAT, allowNull: true },
    subscribed: { type: DataTypes.BOOLEAN, defaultValue: false },
    last_report_time: { type: DataTypes.BIGINT, allowNull: true }
  }, { timestamps: true });

  const Incident = sequelize.define('Incident', {
    id: { type: DataTypes.STRING, primaryKey: true },
    reporter: { type: DataTypes.STRING, allowNull: true },
    lat: { type: DataTypes.FLOAT, allowNull: true },
    lon: { type: DataTypes.FLOAT, allowNull: true },
    text: { type: DataTypes.TEXT, allowNull: true },
    ts: { type: DataTypes.BIGINT }
  }, { timestamps: true });

  const RiskPoint = sequelize.define('RiskPoint', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    label: { type: DataTypes.INTEGER },      // 0/1/2
    score: { type: DataTypes.FLOAT },
    lat: { type: DataTypes.FLOAT },
    lon: { type: DataTypes.FLOAT },
    meta: { type: DataTypes.JSON }
  }, { timestamps: true });

  models = { User, Incident, RiskPoint, sequelize };
  return models;
}

export function getModels() {
  return models;
}
