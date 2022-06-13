import { User } from "../models/User";
import { Arg, Mutation, Resolver } from "type-graphql";
import argon2 from "argon2";
import { UserMutationResponse } from "../types/UserMutationResponse";
import { RegisterInput } from "../types/Registerinput";
import { validateRegisterInput } from "../utils/validateRegisterInput";

@Resolver()
export class UserResolver {
  @Mutation((_returns) => UserMutationResponse, { nullable: true })
  async registerUser(
    @Arg("registerInput") registerInput: RegisterInput
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

        const newUser = User.create({ email, password: hasPassword, username });

        return {
          code: 200,
          success: true,
          message: "User registration successful",
          user: await User.save(newUser),
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
}
