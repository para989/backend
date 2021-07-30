<h1 align="center">
  <br>
  <a href="https://fooddyshop.com"><img src="https://raw.githubusercontent.com/fooddyshop/backend/main/icon.png" alt="FooddyShop eCommerce CMS" width="200"></a>
  <br>
  FooddyShop eCommerce CMS on Node.js
  <br>
</h1>

<h4 align="center">FooddyShop eCommerce CMS is a turnkey solution for accepting pre-orders and delivery orders.</h4>

<p align="center">
  <a href="https://badge.fury.io/js/%40fooddyshop%2Fbackend"><img src="https://badge.fury.io/js/%40fooddyshop%2Fbackend.svg" alt="npm version" height="18"></a>
</p>

<p align="center">
  <a href="#demo">Demo</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#how-to-use">How To Use</a> •
  <a href="#license">License</a>
</p>

![screenshot](https://raw.githubusercontent.com/fooddyshop/backend/main/site.gif)

## Demo

#### Website

<https://fooddy.site/>

#### Office (Control Panel)

<https://fooddy.site/office/>

Demo access:
* Login: demo@fooddy.site
* Password: 12345

#### Android application

<https://play.google.com/store/apps/details?id=site.fooddy.app>

## Key Features

### Powerful CMS

CMS for the online store FooddyShop contains:

* Full content management (points of sale, product catalog, modifiers, ingredients, stickers, promotions, discounts)
* Customizable skins and code editor (js, css)
* Simple registration of customers via sms (twilio) or email
* Special blocks with goods, promotions, banners
* Separation of access rights to office sections
* Ability to accept orders in the Office, by email, Telegram bot
* Possibility to connect any payment systems
* Possibility of translation into any language

### Office

Office allows you to edit and view:

* Points of sales
* Orders
* Products
* Modifiers
* Ingredients
* Stickers
* Customers
* Promotions
* Notifications
* Subscriptions
* Gifts
* Promo codes
* Cashback
* Reviews
* Employees
* Sales reports
* Settings

### Advanced product cards

The engine of the FooddyShop online store has advanced product cards:

* Convenient element editor with the ability to upload images
* Any number of images attached to the product, changing their order, captions to images
* Automatic image scaling, automatic image preview
* Short and full description of the product, a set of parameters and properties
* Multiple prices for one product
* Modifications of goods (by color, size, quantity in a package, etc.)
* Ability to insert video into product description
  
### Customizable shopping cart

In the CMS of the online store on FooddyShop, you can customize the cart as you want:

* Setting up the receiving method: inside, take away, delivery
* Setting up a payment method: Apple Pay, Google Pay, PayPal, Stripe, Cash, POS and others
* Track your order status
* Additional fields on the checkout page (checkboxes, drop-down lists, text fields)

## How To Use

#### Requires

* [Git](https://git-scm.com)
* [MongoDB](https://docs.mongodb.com/v5.0/installation/)
* [Redis](https://redis.io/topics/quickstart)
* [Node.js](https://nodejs.org/en/download/)

```bash
# Clone the repository
$ git clone git@github.com:fooddyshop/example.git

# Go into the repository
$ cd example

# Install dependencies
$ npm install --force

# Run the app
$ npm start
```

Website: <http://localhost:4000/>

Office: <http://localhost:4000/office/>
* Login: admin@example.com (you can change this inside)
* Password: admin (you can change this inside)

If you need a professional server setup, write to us: <mail@fooddyshop.com>.

## License

ISC
