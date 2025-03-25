const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const port = 3000;

// Підключення до MongoDB
mongoose.connect('mongodb://localhost:27017/chatApp', { useNewUrlParser: true, useUnifiedTopology: true });

// Схема користувача
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});

const User = mongoose.model('User', userSchema);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.use(session({
    secret: 'secret key',
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/register.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/chat', (req, res) => {
    if (req.session.user) {
        res.sendFile(__dirname + '/chat.html');
    } else {
        res.redirect('/login');
    }
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });

    user.save(err => {
        if (err) {
            res.redirect('/register');
        } else {
            req.session.user = user;
            res.redirect('/chat');
        }
    });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = user;
        res.redirect('/chat');
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

io.on('connection', socket => {
    console.log('Нове з\'єднання');

    socket.on('chatMessage', msg => {
        io.emit('message', msg);
    });

    socket.on('disconnect', () => {
        console.log('Користувач відключився');
    });
});

server.listen(port, () => {
    console.log(`Сервер запущено на http://localhost:${port}`);
});
