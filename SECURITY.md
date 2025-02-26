# Security Policy

## Reporting a Vulnerability

We take the security of Specif-ai MCP Server seriously. If you believe you've found a security vulnerability, please follow these steps:

1. **Do not disclose the vulnerability publicly**
2. **Email the details to **
   - Provide a detailed description of the vulnerability
   - Include steps to reproduce the issue
   - Mention the version of the software where you found the vulnerability
   - If possible, include suggestions for fixing the vulnerability

## What to Expect

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will provide a more detailed response within 7 days
- We will work with you to understand and address the issue
- We will keep you informed of our progress
- Once the vulnerability is fixed, we will publicly acknowledge your responsible disclosure (unless you prefer to remain anonymous)

## Security Best Practices for Users

1. **Keep the package updated**: Always use the latest version of the Specif-ai MCP Server
2. **Validate inputs**: When integrating with the server, ensure all inputs are properly validated
3. **Manage permissions**: Ensure proper file system permissions are set for the project directory
4. **Secure your environment**: Follow security best practices for your Node.js environment

## Security Measures

The Specif-ai MCP Server implements several security measures:

1. **Input validation**: All inputs are validated using Zod schemas
2. **Error handling**: Proper error handling to prevent information leakage
3. **Dependency scanning**: Regular scanning of dependencies for vulnerabilities
4. **Code reviews**: All code changes undergo review before merging

## Disclosure Policy

When a security vulnerability is reported, we follow this disclosure process:

1. The security team verifies the vulnerability
2. We develop a fix and test it thoroughly
3. We release a patch and notify users
4. After users have had sufficient time to update, we may publish a security advisory

Thank you for helping keep Specif-ai MCP Server and its users safe!
