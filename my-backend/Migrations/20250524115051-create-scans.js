"use strict";
// import User       from "../Models/user"

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Enable PostGIS extension (run once)
    await queryInterface.sequelize.query(
      `CREATE EXTENSION IF NOT EXISTS postgis;`
    );

    await queryInterface.createTable("Scans", {
      scan_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      scan_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      campaign_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "Campaigns",
          key: "campaign_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "Users", // Must match table name exactly
          key: "user_id", // Must match PK in Users table
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true,
      },

      scan_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      num_points: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      bbox_min: {
        type: Sequelize.ARRAY(Sequelize.FLOAT),
        allowNull: true,
      },
      bbox_max: {
        // cSpell:ignore bbox
        type: Sequelize.ARRAY(Sequelize.FLOAT),
        allowNull: true,
      },
      location_geometry: {
        type: Sequelize.GEOMETRY("POINT"),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Scans");
  },
};
