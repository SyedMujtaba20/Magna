module.exports = (sequelize, DataTypes) => {
  const Campaign = sequelize.define('Campaign', {
    campaign_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    furnace_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'Campaigns',
    underscored: true,
  });

  Campaign.associate = (models) => {
    Campaign.belongsTo(models.Furnace, { foreignKey: 'furnace_id' });
    Campaign.hasMany(models.Scan, { foreignKey: 'campaign_id' });
  };

  return Campaign;
};
