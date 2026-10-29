module.exports = (sequelize, DataTypes) => {
  const OilDepot = sequelize.define('OilDepot', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    location: {
      type: DataTypes.STRING(200)
    },
    capacity: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    current_stock: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    created_by: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'oil_depots',
    timestamps: false
  });

  return OilDepot;
};
