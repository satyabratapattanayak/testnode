# crmapi

This project was generated with [Node](https://github.com/nodejs/node).

## Development server

Run `npm start` for a dev server. Navigate to `http://localhost:5000/`. The app will automatically reload if you change any of the source files.

## How to do the set up the local machine for the project

In this section, we will learn how to set up a local development environment
1. Install nodejs using the below command:
```bash
$ sudo apt install nodejs
```
2. Check the node version using the below command:
```bash
$ node -v
```
3. Normally, NPM will be installed with the Node.js itself. However, we can run the below command to install it if not installed.
```bash
$ sudo apt install npm
```
4. Check the npm version using the below command:
```bash
$ npm -v
```
5. Check the nodemon is installed or not if not then use the below command to install that:
```bash
$ sudo npm install -g nodemon
```

## How to run it locally
1. [Download](https://github.com/seventechco/CRMBackend/archive/refs/heads/master.zip) or clone the [repository](https://github.com/seventechco/CRMBackend.git) to your local machine:
```bash
$ git clone https://github.com/seventechco/CRMBackend.git
```

2. Run `npm install` inside the cloned folder:
```bash
$ npm install
```

## How to install mongodb on your local machine

1. Install mongodb using the below command:
```bash
$ sudo apt install mongodb
```
2. Check the mongodb version using the below command:
```bash
$ mongodb --version
```

## How to install studio3t for databased setup.
1. [Download](https://robomongo.org/download) studio 3t to your local machine:
```bash
$ https://robomongo.org/download
```
2. Extrace the folder and install the package. You will get one installation link to sign in. After that the app will get installed on you machine.
3. Open Studio 3T, click on "Connect", Then click on "New Connection".
```bash
 Connect==>New Connection
```
4. Create a url string to connect on to the database like below.
```bash
mongodb://<user_name>:<password>@<host>:<port>/<db_name>
```
Note: Please replace the user_name, password, host, port, dbname as per your details.
5. Add the above url on the option given and hit next it will create the connection
6. Then give a connection name and check for "Test Connection". Save the connection.
7. Select the connection and then connect. It will connect and open the database for you.
## How to test teh connection on local machine

1. Check the .env file for the connection and check the parameters if these are as per the set up. If not then change it accordingly. And to test it you can change the value from front end and check those valuse on your local database table



#### Docker Setup
We have multiple deployment modes via Docker because of multiple database 
1. Development
2. Production
3. New Server whihc do not have mongodb

### Instructions

## 1. [Download](https://github.com/seventechco/CRMBackend/archive/refs/heads/master.zip) or clone the [repository](https://github.com/seventechco/CRMBackend.git) to your local machine:
```bash
git clone https://github.com/seventechco/CRMBackend.git
cd CRMBackend
```

## 2. Adding details from respective env file to the main .env file
For local env
```bash
cp .env.local .env
```

For dev env
```bash
cp .env.dev .env
```

For prod env
```bash
cp .env.prod .env
```

## 2. Build the backend Docker image
```bash
docker build -t crm-backend .
```

## 3. Run the docker compose
For development environment
```bash
docker-compose up --build -d
```

When we will use a new server for setup we need to update the required details on the .env.newserver file.
