const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const ws = require('ws');
const bcrypt = require("bcryptjs")
const fs=require('fs');
const cors = require('cors')
require('dotenv').config();

const User = require('./models/User')
const Message = require('./models/Message');

mongoose.connect(process.env.MONGO_URL);
jwtkey = process.env.JWT_SECRET;

const port= process.env.PORT || 8000;

const app = express();
app.use('/uploads',express.static(__dirname+'/uploads'));
app.use(express.json());
app.use(cookieParser());
const corsOptions = {
    origin: process.env.FRONTEND_URL,
    credentials: true
};
app.use(cors(corsOptions));

const verifyToken = (req, res, next) => {
    let token = req.cookies?.token;

    if (!token) {
        const authHeader = req.headers['Authorization'];
        if (authHeader) {
            token = authHeader.split(' ')[1];
        }
    }

    if (token) {
        jwt.verify(token, jwtkey, (err, userData) => {
            if (err) {
                console.log('Token verification failed: ', err);
                res.status(401).json("Token verification failed");
            }
            else {
                req.userData = userData;
                next();
            }
        })
    }
    else {
        res.status(401).json("No token");
    }
}

app.get('/profile', verifyToken, (req, res) => {
    res.json(req.userData);
})

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: "All fields are required" });
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const createUser = await User.create({ username, password: hashedPassword });

        const token = jwt.sign({ username, userId: createUser._id }, jwtkey);

        res.cookie('token', token, { sameSite: 'None', secure: 'true', httpOnly: true }).status(201).json({ token, username, userId: createUser._id })
    }
    catch (err) {
        console.log(err);
    }
})

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: "Username and password are required" });

        const user = await User.findOne({ username });
        if (user) {
            if (await bcrypt.compare(password, user.password)) {
                const token = jwt.sign({ userId: user._id, username }, jwtkey);
                return res.cookie('token', token, { sameSite: 'None', secure: 'true', httpOnly: true }).status(201).json({ token, username, userId: user._id })
            }
            else{
                res.status(401).json("Incorrect password");
            }
        }
        return res.status(401).json({ message: 'User not found' });
    }
    catch (err) {
        console.log(err);
    }
})

app.post('/logout', async (req, res) => {
    res.clearCookie('token', { sameSite: 'none', secure: 'true' }).json('logged out');
})

app.get('/people', async (req, res) => {
    const allPeople = await User.find({}, { _id: 1, username: 1 });
    const people = {};
    allPeople.forEach(({ _id, username }) => {
        people[_id] = username;
    })
    res.json(people);
})

app.get('/messages/:userId', verifyToken, async (req, res) => {
    const { userId } = req.params;
    const userData = req.userData;
    const ourUserId = userData.userId;

    const messages = await Message.find({
        sender: { $in: [userId, ourUserId] },
        recipient: { $in: [userId, ourUserId] }
    }).sort({ createdAt: 1 });

    res.json(messages);
})

const server = app.listen(port, () => {
    console.log("Server is listening on port: ",port)
});

const wss = new ws.WebSocketServer({ server });



wss.on('connection', (connection, req) => {


    function notifyAboutOnlinePeople() {
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username }))
            }))
        })
    }

    connection.isAlive = true;

    connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() => {
            connection.isAlive - false;
            clearInterval(connection.timer);
            connection.terminate();
            notifyAboutOnlinePeople();
        }, 1000)
    }, 2000);


    connection.on('pong', () => {
        clearTimeout(connection.deathTimer)
    })

    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenCookieString = cookies.split(';').find(str => str.startsWith("token="));
        if (tokenCookieString) {
            const token = tokenCookieString.split("=")[1];
            if (token) {
                jwt.verify(token, jwtkey, (err, userData) => {
                    if (err) {
                        console.log('Token verification failed: ', err);
                    }
                    else {
                        const { userId, username } = userData;
                        connection.userId = userId;
                        connection.username = username;
                    }
                })
            }
        }
    }

    connection.on('message', async (message) => {
        const messageData = JSON.parse(message.toString());
        const { recipient, text, file } = messageData;
        let filename=null;
        if(file)
        {
            const parts=file.name.split('.');
            const ext=parts[parts.length-1];
            filename=Date.now() + '.' + ext;
            const path=__dirname + '/uploads/' + filename;
            const bufferData=Buffer.from(file.data.split(',')[1], 'base64');
            fs.writeFile(path,bufferData,()=>{
                console.log("File saved: ",path);
            });
        }
        if (recipient && (text || file)) {
            const messageDoc = await Message.create({
                sender: connection.userId,
                recipient,
                text,
                file: file ? filename:null
            });
            [...wss.clients]
                .filter(c => c.userId == recipient)
                .forEach(c => c.send(JSON.stringify({ text, file: file ? filename : null, sender: connection.userId, recipient, _id: messageDoc._id })))
        }
    });

    connection.on('close', () => {
        const userConnectionsArray = Array.from(wss.clients);
        const connectionToRemove = userConnectionsArray.find(client => client.userId === connection.userId);

        if (connectionToRemove) {
            wss.clients.delete(connectionToRemove);
        }
        notifyAboutOnlinePeople();
    })

    notifyAboutOnlinePeople();
})
