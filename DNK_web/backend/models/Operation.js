module.exports = (sequelize, DataTypes) => {
  const Operation = sequelize.define('Operation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    operation_type: {
      type: DataTypes.ENUM('receive', 'dispatch'),
      allowNull: false
    },
    depot_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'oil_depots',
        key: 'id'
      }
    },
    tank_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tanks',
        key: 'id'
      }
    },
    fuel_type: {
      type: DataTypes.STRING(50)
    },
    volume: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    source_destination: {
      type: DataTypes.STRING(200)
    },
    transport_type: {
      type: DataTypes.ENUM('shuttle', 'spaceship')
    },
    operator_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT  
    },
    document_reference: {
      type: DataTypes.STRING(100)
    }
  }, {
    tableName: 'operations',
    timestamps: false
  });

  return Operation;
};
