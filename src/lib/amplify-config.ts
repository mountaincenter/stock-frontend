import { Amplify } from 'aws-amplify';

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
          scopes: ['email', 'openid', 'profile', 'aws.cognito.signin.user.admin'],
          redirectSignIn: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN!],
          redirectSignOut: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT!],
          responseType: 'code' as const,
        },
      },
    },
  },
};

export function configureAmplify() {
  Amplify.configure(amplifyConfig);
}

export default amplifyConfig;
