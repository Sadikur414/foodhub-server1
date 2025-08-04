const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require("jsonwebtoken")
const port = process.env.PORT || 5000;


//middlewares
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_DB_PASSWORD}@cluster0.s6ixckq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menucollection = client.db("foodhubs").collection("menu");
    const reviewcollection = client.db("foodhubs").collection("reviews");
    const cartcollection = client.db("foodhubs").collection("carts");
    const userscollection = client.db("foodhubs").collection("users");

// jwt related apis
app.post("/jwt", async(req,res)=>{
  const user = req.body;
  const token = jwt.sign(user, process.env.SECRET_KEY,{expiresIn:"1d"});
  res.send({token})
})

// ***********************middleware verifyToken******************************
const verifyToken =(req,res,next)=>{
  console.log(req.headers);
  if(!req.headers.authorization){
     return  res.status(401).send({message: "unauthorized access"})
  }
const token = req.headers.authorization.split(' ')[1]
  jwt.verify(token, process.env.SECRET_KEY , (err,decoded)=>{
    if(err){
     return  res.status(403).send({message: "forbiden access"})
    }
    req.decoded = decoded ;
    next()
  })
} 
 //use verify admin after verify token
const verifyAdmin = async (req,res,next) =>{
const email = req.decoded.email;
const query = {email:email};
const user = await userscollection.findOne(query)
const isAdmin = user?.role ==="admin";
if(!isAdmin){
  return res.status(403).send({message:"forbiden access"})
}
 next()
}
// ***********************users related apis***********************
app.get("/users", verifyToken, verifyAdmin, async(req,res)=>{
  const result = await userscollection.find().toArray();
  res.send(result)
})

app.get("/users/admin/:email" ,verifyToken, async(req,res) =>{
 const email = req.params.email;
 if(email !== req.decoded.email){
  return res.status(403).send({message:"forbiden access"})
 }
 const query = {email:email};
 const user = await userscollection.findOne(query);
let admin = false;
if(user){
  admin = user?.role === "admin"
}
res.send({admin})
})

app.post("/users", async(req,res) =>{
  const user = req.body;
  const query = {email: user.email};
   const existingUser = await userscollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "User already exists", insertedId: null });
  }
  const result = await userscollection.insertOne(user);
  res.send(result) 
})

app.patch("/users/:id", verifyToken, verifyAdmin, async(req,res) =>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const updateDoc = {
    $set:{
      role: "admin"
    }
  };
  const result = await userscollection.updateOne(filter,updateDoc);
  res.send(result)
})

app.delete("/users/:id", verifyToken, verifyAdmin, async(req,res)=>{
  const id = req.params.id;
  const filter = {_id : new ObjectId(id)};
  const result = await  userscollection.deleteOne(filter);
  res.send(result)
})

//***************************  menu realted api***************************
app.get("/menu",async (req,res) =>{
    const result = await menucollection.find().toArray();
    res.send(result);
})

app.get('/menu/:id', async(req,res) =>{
  const id = req.params.id;
    const query = { _id: id };  // Convert string id to ObjectId
    const result = await menucollection.findOne(query);
 res.send(result)
})

app.patch('/menu/:id', async (req,res) =>{
  const item = req.body;
  const id = req.params.id;
  const filter = {_id: id};
  const updatedDoc = {
    $set:{
      name: item.name,
      category:item.category,
      price:item.price,
      recipe:item.recipe,
      image:item.image
    }
  }
  const result =await menucollection.updateOne(filter, updatedDoc);
   res.send(result)
  
})

app.post("/menu", async(req,res) =>{
 const menu = req.body;
  const result =await menucollection.insertOne(menu);
  res.send(result)
})

app.delete("/menu/:id", async(req,res) =>{
  const  id = req.params.id;
  const query = {_id : new ObjectId(id)};
  const result =await menucollection.deleteOne(query);
  res.send(result)
})
// ********************************cart related api*****************************
app.post("/cart",async(req,res)=>{
  const cartData = req.body;
  const result = await cartcollection.insertOne(cartData);
  res.send(result)

})


app.get("/cart",async(req,res) =>{
  const email = req.query.email;
  const query = { user_email:email}
  const result = await cartcollection.find(query).toArray();
  res.send(result)
})


app.delete("/cart/:id", async(req,res) =>{
  const id = req.params.id;
   const query = {_id: new ObjectId(id)};
   const result = await cartcollection.deleteOne(query);
   res.send(result)
})

// *******************************review api****************************

app.get("/reviews",async (req,res) =>{
    const result = await reviewcollection.find().toArray();
    res.send(result);
})

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/",(req,res) =>{
    res.send("hi")
})


app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
})