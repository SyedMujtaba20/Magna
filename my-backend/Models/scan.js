module.exports = (sequelize, DataTypes) => {
  const Scan = sequelize.define('Scan', {
    scan_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    scan_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    campaign_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    scan_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    num_points: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bbox_min: {
      type: DataTypes.ARRAY(DataTypes.FLOAT),
      allowNull: true,
    },
    bbox_max: {
      type: DataTypes.ARRAY(DataTypes.FLOAT),
      allowNull: true,
    },
    location_geometry: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true,
    },
  }, {
    tableName: 'Scans',
    underscored: true,
  });

  Scan.associate = (models) => {
    Scan.belongsTo(models.Campaign, { foreignKey: 'campaign_id' });
    Scan.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return Scan;
};
