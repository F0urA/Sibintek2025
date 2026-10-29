module.exports = (sequelize, DataTypes) => {
  const Truck = sequelize.define('Truck', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    plate_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    capacity: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    fuel_type: {
      type: DataTypes.STRING(50)
    },
    driver_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('available', 'in_transit', 'maintenance'),
      defaultValue: 'available'
    }
  }, {
    tableName: 'trucks',
    timestamps: false
  });

  return Truck;
};
