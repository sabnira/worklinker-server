const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId, LEGAL_TCP_SOCKET_OPTIONS } = require('mongodb')
require('dotenv').config()

const port = process.env.PORT || 9000
const app = express()

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zlvar1f.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {

    const db = client.db('workLinker-db')
    const jobsCollection = db.collection('jobs')
    const bidsCollection = db.collection('bids')

    //save a jobData in db
    app.post('/add-job', async (req, res) => {
      const jobData = req.body
      const result = await jobsCollection.insertOne(jobData)
      console.log(result)
      res.send(result)
    })

    //get all jobs data from db
    app.get('/jobs', async (req, res) => {
      const result = await jobsCollection.find().toArray()
      res.send(result)
    })

    //get all jobs posted by a specific user
    app.get('/jobs/:email', async (req, res) => {
      const email = req.params.email
      const query = { 'buyer.email': email }
      const result = await jobsCollection.find(query).toArray()
      res.send(result)
    })


    //delete a job from db
    app.delete('/job/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.deleteOne(query)
      res.send(result)
    })


    //get a single job data by id from db
    app.get('/job/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query)
      res.send(result)
    })


    //update a jobData in db
    app.put('/update-job/:id', async (req, res) => {
      const id = req.params.id
      const jobData = req.body
      const updated = {
        $set: jobData,
      }
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true }

      const result = await jobsCollection.updateOne(query, updated, options)
      console.log(result)
      res.send(result)
    })


    //save a bidData in db
    app.post('/add-bid', async (req, res) => {

      const bidData = req.body

      //0. if a user placed a bid already in this job
      const query = { email: bidData.email, jobId: bidData.jobId }
      const alreadyExist = await bidsCollection.findOne(query)

      //1. save data in bids collection
      const result = await bidsCollection.insertOne(bidData)

      console.log('if already exist:' ,alreadyExist);
      if (alreadyExist)
        return res
          .status(400)
          .send('You have already placed a bid on this job!')

      //2. increase bid count in jobs collection
      const filter = { _id: new ObjectId(bidData.jobId) }
      const update = {
        $inc: { bid_count: 1 }
      }
      const updateBidCount = await jobsCollection.updateOne(filter, update)

      res.send(result)
    })


    //get all bids and get all bid requests from a specific user
    app.get('/bids/:email', async (req, res) => {
      const isBuyer = req.query.buyer
      const email = req.params.email

      let query = {}
      if (isBuyer){
        query.buyer = email
      } else {
        query.email = email
      }

      const result = await bidsCollection.find(query).toArray()
      res.send(result)
    })


    //update bid status
    app.patch('/bid-status-update/:id', async (req, res) => {
      const id = req.params.id 
      const {status} = req.body
      const filter = {_id: new ObjectId(id)}
      const update = {
        $set: {status},
      }
      const result = await bidsCollection.updateOne(filter, update)
      res.send(result)
    })

    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {

  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from WorkLinker Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
