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

  const apolloServer = new ApolloServer({
    schema: await buildSchema({ resolvers: [HelloResolver, UserResolver], validate: false }),
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
