const express = require('express');
const { trusted } = require('mongoose');
const Stripe = require('stripe');
const { Order } = require('../models/order');

require('dotenv').config();

const stripe = Stripe(process.env.STRIPE_KEY);

const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {

  const customer = await stripe.customers.create({
    metadata: {
      userId: req.body.userID,
    }
  })

  const line_items = req.body.cartItem.map((item) => {
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: [item.image.url],
          description: item.desc,
          metadata: {
            id: item.id,
          }
        },
        unit_amount: item.price * 100,
      },
      quantity: item.cartQuantity,
    }
  })

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    shipping_address_collection: {
      allowed_countries: ['US', 'ID']
    },
    shipping_options:[
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: {
          amount: 0,
          currency: 'usd',
        },
        display_name: 'Free Shipping',
        delivery_estimate: {
          minimum: {
            unit: 'business_day',
            value: 5
          },
          maximum: {
            unit: 'business_day',
            value: 7
          }
        }
      }
    },
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: {
          amount: 1500,
          currency: 'usd',
        },
        display_name: 'Next Day',
        delivery_estimate: {
          minimum: {
            unit: 'business_day',
            value: 1
          },
          maximum: {
            unit: 'business_day',
            value: 1
          }
        }
      }
    }],
    phone_number_collection: {
      enabled: true
    },
    customer: customer.id,
    line_items,
    mode: 'payment',
    success_url: `${process.env.CLIENT_URL}/checkout-success`,
    cancel_url: `${process.env.CLIENT_URL}/cart`
  });

  res.send({url: session.url });
});

// Creating Order
const createOrder = async(customer, data, lineItems) => {
  const newOrder = new Order({
    userId: customer.metadata.userId,
    customerId: data.customer,
    paymentIntentId: data.payment_intent,
    products: lineItems.data,
    subtotal: data.amount_subtotal,
    total: data.amount_total,
    shipping: data.customer_details,
    payment_status: data.payment_status,
  });

  try {
    const saveOrder = await newOrder.save();
    console.log("Processed Order: ", saveOrder);
  } catch (error) {
    console.log(error);
  }

};

// stripe webhook

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = "whsec_hHBdsW2YF7uxD4itSEbtitA6AtakuoXV";

router.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  
  const sig = req.headers['stripe-signature'];

  let data;
  let eventType;

  if (endpointSecret){
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log("Webhook Verified");
    } catch (err) {
      console.log(`Webhook Error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    } 

    data = event.data.object;
    eventType = event.type;

  } else {
    data = req.body.data.object;
    eventType = req.body.type;
  }

  // Handle the event

  if (eventType === "checkout.session.completed"){
    stripe.customers.retrieve(data.customer).then(
      (customer) => {
        stripe.checkout.sessions.listLineItems(
          data.id,{}, 
          function (err, lineItems){
            console.log(lineItems);
            createOrder(customer, data, lineItems);
          }
        );
      }
    ).catch(err => console.log(err.message));
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send().end();
});

module.exports = router
