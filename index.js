const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

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
const reviewCollection = client.db('metroHomes').collection('reviews')
const wishlistCollection = client.db('metroHomes').collection('wishlists')
const offerCollection = client.db('metroHomes').collection('offers')
const paymentCollection = client.db('metroHomes').collection('payments')



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

app.get('/allProperties', async(req, res)=>{
  const result = await propertyCollection.find().toArray()
  res.send(result)
})

app.get('/properties', async (req, res) => {
  const search = req.query.search || '';
  const status = req.query.status;
  const sort = req.query.sort;
  let query = {
    location: { $regex: search, $options: 'i' },
    status: 'Verified'
  }
  let options ={}
  if (sort)
    options = {sort: {min_price: sort === 'asc' ? 1 : -1}}
  // if (sort){
  //   options.sort = {min_price: sort === 'asc' ? 1 : -1}
  // }

  const result = await propertyCollection.find(query, options).toArray()
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

app.put('/property/update/:id', async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) }
  const propertyData = req.body;
  console.log(propertyData)
  const options = {upsert: true}
  const updateProperty = {
    $set: 
     { ...propertyData}
    
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

// review related apis

app.get('/reviews', async(req, res)=>{
  const result = await reviewCollection.find().toArray()
  res.send(result)
})

app.get('/myReviews/:email', async(req, res)=>{
  const email = req.params.email;
  console.log(email)
  const query = { 'authorEmail': email }
  const result = await reviewCollection.find(query).toArray()
  res.send(result)
})

app.get('/reviews/:propertyId', async(req, res)=>{
  const propertyId = req.params.propertyId;
  
  const query = { 'propertyId': propertyId }
  const result = await reviewCollection.find(query).toArray()
  res.send(result)
})

app.post('/reviews', async(req, res)=>{
  const reviewData = req.body;
  const result = await reviewCollection.insertOne(reviewData)
  res.send(result)
})

app.delete('/review/:id', async(req, res)=>{
  const id = req.params.id;
  console.log(id)
  const query = { _id: new ObjectId(id) }
  const result = await reviewCollection.deleteOne(query)
  res.send(result)
})

// wishlist related api

app.get('/wishlists/:email', async(req, res)=>{
  const email = req.params.email;
  const query = {email: email}
  const result = await wishlistCollection.find(query).toArray()
  res.send(result)
})

app.post('/wishlists/:email', async(req, res)=>{
  const wishlistData = req.body;
  const email= req.params.email;
  const propertyId = wishlistData.propertyId;

  console.log('wishlist data', wishlistData)
  console.log(email, propertyId)

  const query ={
    email: email, 
    propertyId: propertyId
  }
  console.log(query)
  const alreadyAdded = await wishlistCollection.findOne(query)
  if(alreadyAdded){
    return res.status(400).send('You have already added')
  }
  const result = await wishlistCollection.insertOne(wishlistData)
  res.send(result)
})


// offer related api

app.get('/offers', async(req, res)=>{
  const result = await offerCollection.find().toArray()
  res.send(result)
})

app.get('/offers/:email', async(req, res)=>{
  const email = req.params.email;
  const query = {email: email};
  const result = await offerCollection.find(query).toArray()
  res.send(result)
})

app.get('/sentOffers/:agentEmail', async(req, res)=>{
  const email = req.params.agentEmail;
  console.log(email)
  const query= {agentEmail: email}
  const result = await offerCollection.find(query).toArray()
  res.send(result)
})

app.post('/offers', async(req, res)=>{
  const offerData = req.body;
  const query = {
    email: offerData.email,
    propertyId: offerData.propertyId
  }

  const alreadyOffered = await offerCollection.findOne(query)
  if(alreadyOffered){
    return res.status(400).send({message: "You have already made an offer for this property"})
  }

  if(offerData.amount < offerData.min_price || offerData.amount > offerData.max_price){
    return res.status(400).send({message: "Offered amount must be within the price range"})
  }

  const result = await offerCollection.insertOne(offerData)
  res.send(result)
})


app.patch('/offers/status/:id', async(req, res)=>{
  const id = req.params.id;
  const status = req.body.status;
  const query = { _id: new ObjectId(id)}
  const updateDoc = {
    $set: { status : status }
  }
  const result = await offerCollection.updateOne(query, updateDoc)
  res.send(result)
})


// payment intent



app.post('/create-payment-intent', verifyToken, async(req, res)=>{
  const { price } = req.body;
  const priceInCent = parseInt(price * 100);
  console.log(priceInCent, 'amount inside the intent')
  
  if(!price || priceInCent < 1) return

  const paymentIntent = await stripe.paymentIntents.create({
    amount: priceInCent,
    currency: "usd",
    payment_method_types: ['card']
  })
  res.send({
    clientSecret: paymentIntent.client_secret
  })
})


app.get('/payments', async(req, res)=>{
  const result = await paymentCollection.find().toArray()
  res.send(result)
})

app.get('/payment/:email', async(req, res)=>{
  const email = req.params.email;
  const query = {email: email}
  const result = await paymentCollection.find(query).toArray()
  res.send(result)
})

app.get('/soldProperties/:agentEmail', async(req, res)=>{
  const email = req.params.agentEmail;
  console.log(email)
  const query= {agentEmail: email}
  const result = await paymentCollection.find(query).toArray()
  res.send(result)
})

// save payments
app.post('/payments', async(req, res)=>{
  const paymentsData = req.body;
  const result = await paymentCollection.insertOne(paymentsData)
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