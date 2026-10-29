module.exports = (sequelize, DataTypes) => {
  const Route = sequelize.define('Route', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    truck_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'trucks',
        key: 'id'
      }
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    depot_from: {
      type: DataTypes.INTEGER,
      references: {
        model: 'oil_depots',
        key: 'id'
      }
    },
    depot_to: {
      type: DataTypes.INTEGER,
      references: {
        model: 'oil_depots',
        key: 'id'
      }
    },
    azs_destination: {
      type: DataTypes.STRING(100)
    },
    fuel_type: {
      type: DataTypes.STRING(50)
    },
    volume: {
      type: DataTypes.FLOAT
    },
    status: {
      type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'planned'
    },
    departure_time: {
      type: DataTypes.DATE
    },
    arrival_time: {
      type: DataTypes.DATE
    },
    gps_coordinates: {
      type: DataTypes.TEXT  
    },
    notes: {
      type: DataTypes.TEXT  
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'routes',
    timestamps: false
  });

  return Route;
};
