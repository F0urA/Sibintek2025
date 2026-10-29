module.exports = (sequelize, DataTypes) => {
  const Tank = sequelize.define('Tank', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    depot_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'oil_depots',
        key: 'id'
      }
    },
    tank_number: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    fuel_type: {
      type: DataTypes.ENUM('Hydrogen', 'Helium-3', 'Antimatter', 'Plasma'),
      allowNull: false
    },
    capacity: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    current_level: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    last_updated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'tanks',
    timestamps: false
  });

  return Tank;
};
