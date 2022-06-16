import dotenv from "dotenv";
dotenv.config();

import "reflect-metadata";
import express from "express";
import { createConnection } from "typeorm";
import { User } from "./models/User";
import { Post } from "./models/Post";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { UserResolver } from "./resolvers/User";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import session from "express-session";
import { COOKIE_NAME, __prod__ } from "./constants";
import { Context } from "./types/Context";

const main = async () => {
  await createConnection({
    type: "mongodb",
    url: process.env.MONGO_DNS_SEEDLIST_CONNECTION,
    ssl: true,
    logging: true,
    synchronize: true,
    entities: [User, Post],
  });

  const app = express();

  // Session/Cookie store
  const mongoUrl = process.env.MONGO_DNS_SEEDLIST_CONNECTION as string;
  await mongoose.connect(mongoUrl);

  console.log("MongoDB connected");

  app.use(
    session({
      name: COOKIE_NAME,
      store: MongoStore.create({ mongoUrl }),
      cookie: {
        maxAge: 1000 * 60 * 60, // one hour
        httpOnly: true, // JS front end cannot access the cookie
        secure: __prod__, // cookie only works in https
        sameSite: "lax", // protection against CSRF
      },
      secret: process.env.COOKIE_SECRET_DEV_PROD as string,
      saveUninitialized: true, // don't save empty session, right from the start
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): Context => ({ req, res }),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({ app, cors: false });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () =>
    console.log(
      `server started on port ${PORT}. GraphQL server started on localhost:${PORT}${apolloServer.graphqlPath}`
    )
  );
};

main().catch((error) => console.log(error));
