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

const verifyToken = (req, res, next) => {
  // console.log(req.headers);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Unauthorized access' })
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' })
    }
    res.decoded = decoded;
    next()
  })

}


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
app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_SECRET_KEY, { expiresIn: '365d' });
  res.send({ token })
})




// user related APIs

app.put('/user', async(req, res)=>{
  const user = req.body;
  const query = {email: user?.email}

  // for existing users
  const isExist = await userCollection.findOne(query)
  if(isExist){
    if(user.status === 'Requested'){
      const result = await userCollection.updateOne(query, {
        $set: {status: user?.status}
      })
      return res.send(result)
    } else{
      return res.send(isExist)
    }
  }
    
  // for new user
  const options = {upsert: true}
  const updateDoc = {
    $set: {
      ...user,
      timeStamp: Date.now(),
    }
  }
  const result = await userCollection.updateOne(query, updateDoc, options)
  res.send(result)
})

app.get('/users', async (req, res) => {
  const result = await userCollection.find().toArray()
  res.send(result)
})

app.get('/user/:email', async(req, res)=>{
  const email = req.params.email;
  const result = await userCollection.findOne({email})
  res.send(result)
})

app.patch('/users/update/:email', async (req, res) => {
  const email = req.params.email
  const user = req.body
  const query = { email }
  const updateDoc = {
    $set: { ...user, timestamp: Date.now() },
  }
  const result = await userCollection.updateOne(query, updateDoc)
  res.send(result)
})

app.delete('/deleteUser/:email', async (req, res) => {
  const email = req.params.email;
  const result = await userCollection.deleteOne({email});
  res.send(result);
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

app.get('/property/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await propertyCollection.findOne(query)
  res.send(result)
})

app.get('/myAddedProperties/:email', async (req, res) => {
  const email = req.params.email;
  console.log(email)
  const query = { 'agent.email': email }
  const result = await propertyCollection.find(query).toArray()
  res.send(result)
})


app.post('/property', async (req, res) => {
  const propertyData = req.body;
  const result = await propertyCollection.insertOne(propertyData)
  res.send(result)
})

app.put('/updateProperty/:id', async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) }
  const options = { upsert: true };
  const updatedPropertyData = req.body;
  console.log(updatedPropertyData)
  const updateProperty = {
    $set: {
      image: updatedPropertyData.image,
      location: updatedPropertyData.location,
      title: updatedPropertyData.title,
      min_price: updatedPropertyData.min_price,
      max_price: updatedPropertyData.max_price
    }
  }
  const result = await propertyCollection.updateOne(query, updateProperty, options)
  res.send(result)
})

app.delete('/property/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await propertyCollection.deleteOne(query)
  res.send(result)
})

app.patch('/property/status/:id', async(req, res)=>{
  const id = req.params.id;
  const status = req.body.status;
  const query = { _id: new ObjectId(id)}
  const updateDoc = {
    $set: { status : status }
  }
  const result = await propertyCollection.updateOne(query, updateDoc)
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