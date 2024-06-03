const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
require('dotenv').config()

const port = process.env.PORT || 8000;

// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.al6znur.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const userCollection = client.db('metroHomes').collection('users')
const propertyCollection = client.db('metroHomes').collection('properties')


// jwt related api



// user related APIs

app.get('/users', async(req,res)=>{
  const result = await userCollection.find().toArray()
  res.send(result)
})

app.post('/users', async(req, res)=>{
  const user = req.body;
  const query = {email: user.email};
  const existingUser = await userCollection.findOne(query)
  if(existingUser){
    return res.send({message: 'User Already Exists', insertedId: null})
  }
  const result = await userCollection.insertOne(user)
  res.send(result)
})

// property related apis
app.get('/properties', async (req, res) => {
  const search = req.query.search || '';
  let query = {
    location: { $regex: search, $options: 'i' }
  }
  const result = await propertyCollection.find(query).toArray()
  res.send(result)
})

app.get('/property/:id', async(req, res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await propertyCollection.findOne(query)
  res.send(result)
})

app.get('/myAddedProperties/:email', async(req, res)=>{
  const email = req.params.email;
  console.log(email)
  const query = {'agent.email':email}
  const result = await propertyCollection.find(query).toArray()
  res.send(result)
})


app.post('/property', async (req, res) => {
  const propertyData = req.body;
  const result = await propertyCollection.insertOne(propertyData)
  res.send(result)
})

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
  res.send('Metro Homes is running ')
})

app.listen(port, () => {
  console.log(`Metro home server is running on port ${port}`)
})