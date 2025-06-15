'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Scans', 'folder_path', {
      type: Sequelize.STRING,
      allowNull: true,  // Or false if you want it to be mandatory
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Scans', 'folder_path');
  },
};
