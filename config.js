module.exports = {
    port: process.env.PORT || 5000,
    jwtOptions: {
        secret: process.env.JWT_SECRET
    }
};