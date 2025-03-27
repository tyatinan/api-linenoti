require('dotenv').config();
const axios = require('axios');
const moment = require("moment");
const fs = require('fs').promises;
const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN;
const API_URL = process.env.API_URL;
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;
let taskid = 0;
let firstTime = true;
let status = '';
let differenceInMinutesStatus = false;

const TOKEN = "7321793801:AAFrhfrtHbRrKzwq2fglVNmF1SQueYbzYsY"; // ใส่ Token ของบอท
const CHAT_ID = "-4626429192"; // ใส่ Chat ID ของผู้ใช้หรือกลุ่ม // AYA: -4626429192  ,  test : -4616186735

const dataJson = {
    "taskid" : taskid
  };

async function saveData() {
    try {
      const jsonData = JSON.stringify(dataJson);
      await fs.writeFile('data.json', jsonData);
      console.log('File has been written with the content:', jsonData);
    } catch (err) {
      console.error('Error writing file:', err);
    }
  }

async function readData() {
    try {
        const data = await fs.readFile('data.json', 'utf8');
        taskid = JSON.parse(data).taskid;
        console.log('File data:', taskid);
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading file:', err);
        return null;
    }
  }
  
const start = async () => {
    console.log("Start Reading data from file")
    await readData();
}

const checkApiStatus = async () => {
    try {
        const response = await axios.get(API_URL, {
            auth: {
                username: API_USERNAME,
                password: API_PASSWORD
            }
        });

        if (response.status === 200) {
            const dataList = response.data.data;
            dataList.sort((a, b) => a.id - b.id);

            if(taskid === 0){
                const xdata = dataList[8]
                console.log(xdata)
                taskid = xdata.id
                dataJson.taskid = xdata.id + 1
                console.log("dataJson",dataJson.taskid)
                await saveData()
                await sendLineNotify(`Start service for checker status`);
            }


            for (let i = 0; i < dataList.length; i++) {
                const data = dataList[i];
                const datetime = moment(data.datetime).format('DD-MM-YYYY HH:mm');
                const givenTime = moment(data.datetime);
                const currentTime = moment();
                const differenceInMinutes = currentTime.diff(givenTime, 'minutes');
                const currentTimeFormat = moment().format('DD-MM-YYYY HH:mm');
                const emoji = ':❗❗';
                  
                if(data && ( data.id > taskid || taskid ===0 ) ){
                    taskid = data.id;
                    // console.log(`Job ${data.taskid}, status : ${data.category} ${data.message}, time : ${datetime}.`);
                    dataJson.taskid = data.id 
                    console.log("dataJson",dataJson.taskid)
                    await saveData()
                    let categoryText = data.category.toString()
         
                    if (firstTime === false) {
                        if( categoryText !== 'Success' && categoryText !== 'Start' ){
                            categoryText = data.category.toString('utf-8') + emoji.toString('utf-8');
                        
                        }
                        
                        await sendLineNotify(`Job ${data.taskid}, status : ${categoryText} ${data.message.toString()??''}, time : ${datetime}.`);


                        if( differenceInMinutes >= 30){
                            await sendLineNotify(`Job ${data.taskid}, status : Timeout:❗❗ เคสใช้เวลาเกิน 30 นาที, time : ${currentTimeFormat}.`);
                        }
                    }

                    // เลือกเฉพาะ Start หลังจากเริ่มทำงานแล้ว
                    if (categoryText === 'Start' && firstTime === true ) {
                        await sendLineNotify(`Job ${data.taskid}, status : ${categoryText} ${data.message.toString()??''}, time : ${datetime}.`);
                        firstTime = false;
                    }
                }
                console.log(taskid)
            }

        } else {
            await sendLineNotify(`API status check failed. Status code: ${response.status}`);
        }
    } catch (error) {
       //await sendLineNotify(`API status check failed. Error: ${error.message}`);

    }
};

const sendLineNotify = async (message) => {
    try {
        const encodedMessage = encodeURIComponent(message);
        await axios.post(
            'https://notify-api.line.me/api/notify',
            `message=${encodedMessage}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${LINE_NOTIFY_TOKEN}`
                }
            }
        );
        console.log('Notification sent successfully.');
    } catch (error) {
        console.error('Failed to send notification:', error.message);
    }

    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${TOKEN}/sendMessage`,
            {
                chat_id: CHAT_ID,
                text: message 
            }
        );
    
            console.log("✅ Message sent:", response.data);
        } catch (error) {
            console.error("❌ Error sending message:", error.response?.data || error.message);
    }
};

start()
// Check the API status every 5 minute
// setInterval(checkApiStatus, 5 * 60 * 1000);
setInterval(checkApiStatus, 60 * 1000); // 1 min for test
checkApiStatus()