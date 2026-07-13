const fs = require('fs/promises');
const path = require('path');
const moment = require('moment-timezone');

// Log only — sending the HTTP response is the error middleware's job.
const logErr = async (controller, error, req = null) => {
    try { 
        const time = moment()
            .tz("Asia/Phnom_Penh")
            .format("YYYY-MM-DD HH:mm:ss z");

        const logDir = path.join(__dirname, "../../logs");
        const logPath = path.join(logDir, `${controller}.log`);

        await fs.mkdir(logDir, { recursive: true });

        // request info safely  
        const method = req?.method || "N/A";
        const url = req?.originalUrl || "N/A";

        //Build detailed log
        const logMessage = `
        [${time}]
        Controller : ${controller} 
        Method     : ${method}
        URL        : ${url} 
        Message    : ${error.message || error}
        `;

        await fs.appendFile(logPath, logMessage);
    } catch (err) {
        console.error("Error writing log:", err);
    }
};
module.exports = logErr;
// const fs = require('fs/promises');
// const path = require('path');
// const moment = require('moment-timezone');
// const logErr = async (controller, mess_err, res = null) => {
//     try {
//         const offset = moment().tz("UTC+7").format("YYYY-MM-DD HH:mm:ss z");
//         const logDir = path.join(__dirname, "../../logs");
//         const logPath = path.join(logDir, `${controller}.log`);

//         // Create logs directory if it doesn't exist
//         await fs.mkdir(logDir, { recursive: true }).catch(() => { });

//         const logMessage = `${mess_err} + ${offset}\n`;
//         await fs.appendFile(logPath, logMessage);
//     }
//     catch (error) {
//         console.log("Error writing to log file:", error);
//     }

//     if (res && typeof res.status === 'function') {
//         res.status(500).send("Internal Server Error!");
//     }
// };
// module.exports = logErr;