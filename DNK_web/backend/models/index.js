const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');


const User = require('./User')(sequelize, DataTypes);
const OilDepot = require('./OilDepot')(sequelize, DataTypes);
const Tank = require('./Tank')(sequelize, DataTypes);
const Operation = require('./Operation')(sequelize, DataTypes);
const Truck = require('./Truck')(sequelize, DataTypes);
const Route = require('./Route')(sequelize, DataTypes);


OilDepot.hasMany(Tank, { foreignKey: 'depot_id', as: 'tanks' });
Tank.belongsTo(OilDepot, { foreignKey: 'depot_id', as: 'depot' });

Operation.belongsTo(OilDepot, { foreignKey: 'depot_id', as: 'depot' });
Operation.belongsTo(Tank, { foreignKey: 'tank_id', as: 'tank' });
Operation.belongsTo(User, { foreignKey: 'operator_id', as: 'operator' });

Truck.belongsTo(User, { foreignKey: 'driver_id', as: 'driver' });

Route.belongsTo(Truck, { foreignKey: 'truck_id', as: 'truck' });
Route.belongsTo(User, { foreignKey: 'driver_id', as: 'driver' });
Route.belongsTo(OilDepot, { foreignKey: 'depot_from', as: 'depotFrom' });
Route.belongsTo(OilDepot, { foreignKey: 'depot_to', as: 'depotTo' });

module.exports = {
  sequelize,
  User,
  OilDepot,
  Tank,
  Operation,
  Truck,
  Route
};
