import { User } from "../models/User";
import { Arg, Ctx, Mutation, Resolver } from "type-graphql";
import argon2 from "argon2";
import { UserMutationResponse } from "../types/UserMutationResponse";
import { RegisterInput } from "../types/Registerinput";
import { validateRegisterInput } from "../utils/validateRegisterInput";
import { LoginInput } from "../types/Logininput";
import { Context } from "../types/Context";
import { COOKIE_NAME } from "../constants";

@Resolver()
export class UserResolver {
  @Mutation((_return) => UserMutationResponse)
  async registerUser(
    @Arg("registerInput") registerInput: RegisterInput,
    @Ctx() { req }: Context
  ): Promise<UserMutationResponse> {
    const validateRegisterInputError = validateRegisterInput(registerInput);
    if (validateRegisterInputError !== null) {
      return {
        code: 400,
        success: false,
        ...validateRegisterInputError,
      };
    }
    try {
      const { username, email, password } = registerInput;
      const existingUserName = await User.findOne({
        where: { username },
      });
      const existingEmail = await User.findOne({
        where: { email },
      });
      if (existingUserName || existingEmail) {
        return {
          code: 400,
          success: false,
          message: "Duplicate username or email",
          errors: [
            {
              field: existingUserName ? "username" : "email",
              message: `${
                existingUserName ? "username" : "email"
              } already taken`,
            },
          ],
        };
      } else {
        const hasPassword = await argon2.hash(password);

        let newUser = User.create({ email, password: hasPassword, username });

        newUser = await User.save(newUser);
        req.session.userId = newUser.id;

        return {
          code: 200,
          success: true,
          message: "User registration successful",
          user: newUser,
        };
      }
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        success: false,
        message: `Internal server error ${error.message}`,
      };
    }
  }

  @Mutation((_return) => UserMutationResponse)
  async login(
    @Arg("loginInput") { usernameOrEmail, password }: LoginInput,
    @Ctx() { req }: Context
  ): Promise<UserMutationResponse> {
    try {
      const existingUser = await User.findOne(
        usernameOrEmail.includes("@")
          ? {
              where: { email: usernameOrEmail },
            }
          : { where: { username: usernameOrEmail } }
      );

      if (!existingUser) {
        return {
          code: 400,
          success: false,
          message: "User not found",
          errors: [
            {
              field: "usernameOrEmail",
              message: "Username or email incorrect",
            },
          ],
        };
      }

      const passwordValid = await argon2.verify(
        existingUser.password,
        password
      );

      if (!passwordValid) {
        return {
          code: 400,
          success: false,
          message: "Wrong password",
          errors: [{ field: "password", message: "Wrong password" }],
        };
      }

      // Create session and return cookie
      req.session.userId = existingUser.id;

      return {
        code: 200,
        success: true,
        message: "Logged in successfuly",
        user: existingUser,
      };
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        success: false,
        message: `Internal server error ${error.message}`,
      };
    }
  }

  @Mutation((_return) => Boolean)
  logout(@Ctx() { req, res }: Context): Promise<boolean> {
    return new Promise((resolve, _reject) => {
      res.clearCookie(COOKIE_NAME);

      req.session.destroy((error) => {
        if (error) {
          console.log("DESTROYING SESSION ERROR");
          resolve(false);
        }
        resolve(true);
      });
    });
  }
}
