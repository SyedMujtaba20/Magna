module.exports = (sequelize, DataTypes) => {
  const Furnace = sequelize.define('Furnace', {
    furnace_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    geometry: {
      type: DataTypes.GEOMETRY('POLYGON'),
      allowNull: true,
    },
  }, {
    tableName: 'Furnaces',
    underscored: true,
  });

  Furnace.associate = (models) => {
    Furnace.hasMany(models.Campaign, { foreignKey: 'furnace_id' });
  };

  return Furnace;
};
