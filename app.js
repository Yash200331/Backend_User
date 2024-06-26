const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const userModel = require('./models/user');
const postModel = require('./models/post');
const expressSession = require('express-session');
const flash = require('connect-flash');

app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret:"abcdefghijklmnopqrstuvwxyz"

}))
app.use(flash());

app.get('/profile', isLoggedIn, async (req, res)=>{
    let user = await userModel.findOne({email: req.user.email}).populate("posts")
    
    res.render('profile',{user})
})

app.get('/like/:id', isLoggedIn, async (req,res)=>{
    let post = await postModel.findOne({_id: req.params.id}).populate("user")

    if(post.likes.indexOf(req.user.userid) === -1) {

        post.likes.push(req.user.userid)
    }else{
       post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }
    await post.save()
    res.redirect('/profile')
});


app.get('/edit/:id', isLoggedIn, async (req,res)=>{
    let post = await postModel.findOne({_id: req.params.id}).populate("user")

    res.render('edit',{post})

});

app.post('/update/:id', isLoggedIn, async (req,res)=>{
    let post = await postModel.findOneAndUpdate({_id: req.params.id},{content:req.body.content})
    res.redirect('/profile')
})

app.post('/post', isLoggedIn, async (req, res)=>{
    let user = await userModel.findOne({email: req.user.email});

    let post = await postModel.create({
        user:user._id,
        content:req.body.content,
        
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
})

app.get('/', function(req, res){
    
    res.render('index',)
})

app.post('/create', async (req, res) => {
    let {username,email,age,password} = req.body;

    let user = await userModel.findOne({email})

    if(user) res.send("user already exists")

    bcrypt.genSalt(10, async (err, salt) => {
        bcrypt.hash(password, salt, async (err,hash) => {
            let createdUser = await userModel.create({
                username,
                email,
                age,
                password: hash,
            })
            let token = jwt.sign({email,userid:createdUser._id},"shhhh")
            res.cookie("token",token)
            res.redirect("/profile")
        })
    })

})

app.get('/login', (req, res) => {
    let error = req.flash('error')
    res.render('login',{error})
})

app.post('/login', async (req, res) => {
    let {email,password} = req.body;
    let user = await userModel.findOne({email})
    if(!user) return res.status(500).send("Something Went wrong!!!!")

    bcrypt.compare(password, user.password, (err, result) => {
        if(result){
            let token = jwt.sign({email,userid:user._id},"shhhh")
            res.cookie("token",token)
            res.redirect("/profile")

        }else{
            req.flash('error',"something went wrong")
            res.redirect("/login")
        }
    })
});

app.get('/logout', (req, res) => {
    res.cookie("token","")
    res.redirect("/login")
})

function isLoggedIn(req, res, next) {
    if(req.cookies.token === ''){
        res.redirect("/login")
    }else{
        let data = jwt.verify(req.cookies.token,"shhhh")
        req.user = data
        next();
    }
}
app.listen(3000)