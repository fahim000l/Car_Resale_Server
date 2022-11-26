const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();


const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello from resale.com server');
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tzinyke.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    const categoriesCollection = client.db('carResale').collection('categories');
    const productsCollection = client.db('carResale').collection('products');
    const usersCollection = client.db('carResale').collection('users');
    const bookingsCollection = client.db('carResale').collection('bookings');
    const advertisesCollection = client.db('carResale').collection('advertises');


    try {
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });

        app.get('/products', async (req, res) => {
            let query = {};

            if (req.query.email) {
                query = { sellerEmail: req.query.email };
            };

            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const bookingQuery = { productId: id }
            const isBooked = await bookingsCollection.findOne(bookingQuery);
            if (isBooked) {
                return res.send({ message: 'alreadyBooked' });
            }
            const product = await productsCollection.findOne(query);
            res.send(product);

        });

        app.get('/categoryProducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { categoryId: id };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;

            const query = { email: user.email }
            const alreadyInserted = await usersCollection.findOne(query);
            if (alreadyInserted) {
                return;
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/users', async (req, res) => {
            let query;
            if (req.query.email) {
                query = { email: req.query.email };
            }
            else if (req.query.role === 'seller') {
                query = { role: 'Seller' };
            }
            else if (req.query.role === 'buyer') {
                query = { role: 'Buyer' };
            }
            else if (req.query.role === 'admin') {
                query = { role: 'admin' };
            }
            else {
                query = {};
            }

            const user = await usersCollection.find(query).toArray();
            res.send(user);
        });

        app.put('/users/:id', async (req, res) => {
            const seller = req.body;
            const id = seller._id;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const findingUser = await usersCollection.findOne(filter);

            let updatedDoc
            if (findingUser.isVerified) {
                updatedDoc = {
                    $set: {
                        isVerified: false
                    }
                };
            }
            else {
                updatedDoc = {
                    $set: {
                        isVerified: true
                    }
                };
            }


            const result = await usersCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/orders', async (req, res) => {
            let query = {};

            if (req.query.email) {
                query = { clientEmail: req.query.email }
            }

            const orders = await bookingsCollection.find(query).toArray();
            res.send(orders);
        });

        app.post('/addproduct', async (req, res) => {
            const product = req.body;
            const date = new Date();
            product.postedTime = date;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const allDeleteQuery = { productId: id };
            // const isAdvertised = await advertisesCollection.find(isAdvertisedQuery);
            const adverderDeleted = await advertisesCollection.deleteOne(allDeleteQuery);
            const orderDeleted = await bookingsCollection.deleteOne(allDeleteQuery);
            const productDeleted = await productsCollection.deleteOne(query);
            res.send({ productDeleted, adverderDeleted, orderDeleted });
        });

        app.post('/advertisingProducts', async (req, res) => {
            const product = req.body;
            const date = new Date();
            product.date = date;
            const result = await advertisesCollection.insertOne(product);
            res.send(result);
        });

        app.get('/advertisingProducts', async (req, res) => {
            const query = {};


            if (req.query.productId) {
                const checkingQuery = { productId: req.query.productId };
                const alreadyAdvertised = await advertisesCollection.findOne(checkingQuery);
                if (alreadyAdvertised) {
                    return res.send({ message: 'adreadyAdvertised' })
                }
            };

            if (req.query.limit) {
                const advertises = await advertisesCollection.find(query).sort({ date: -1 }).limit(3).toArray();
                return res.send(advertises);
            }

            const advertises = await advertisesCollection.find(query).sort({ date: -1 }).toArray();
            res.send(advertises);

        });
    }
    finally {

    }
}


run().catch(err => console.error(err));


app.listen(port, () => {
    console.log('resale.com is running on port :', port);
});