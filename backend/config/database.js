const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './../database/quiz.sqlite', // Store DB file in database folder
    logging: false
});

const connectDB = async (force = false) => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');
        await sequelize.sync({ force: force }); // Apply force sync if requested
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

module.exports = { sequelize, connectDB };
