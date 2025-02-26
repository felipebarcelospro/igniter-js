# Contributing to Igniter Framework

We love your input! We want to make contributing to Igniter Framework as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with Github

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Development Process

We use GitHub to sync code to and from our internal repository. Pull requests are the best way to propose changes to the codebase.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Development Setup

1. Install dependencies:
```bash
bun install
```

2. Run tests:
```bash
bun test
```

3. Build the project:
```bash
bun run build
```

## Code Style Guidelines

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add TSDoc comments for public APIs
- Keep functions small and focused
- Write unit tests for new functionality

### TypeScript Guidelines

- Enable strict mode
- Use proper type annotations
- Avoid using `any`
- Use interfaces for object types
- Use enums for fixed sets of values
- Use generics when appropriate

### Testing Guidelines

- Write unit tests for all new functionality
- Test both success and error cases
- Mock external dependencies
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable.
2. Update the documentation with any new API changes.
3. The PR will be merged once you have the sign-off of at least one maintainer.

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using Github's [issue tracker](https://github.com/igniter/core/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/igniter/core/issues/new).

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Use a Consistent Coding Style

* Use 2 spaces for indentation
* You can try running `bun run lint` for style unification

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## References

This document was adapted from the open-source contribution guidelines for [Facebook's Draft](https://github.com/facebook/draft-js/blob/a9316a723f9e918afde44dea68b5f9f39b7d9b00/CONTRIBUTING.md).

## Community

* Join our [Discord community](https://discord.gg/igniter)
* Follow us on [Twitter](https://twitter.com/igniterjs)
* Read our [blog](https://igniter.dev/blog)

## Questions?

Feel free to ask in our Discord community or open a discussion on GitHub.