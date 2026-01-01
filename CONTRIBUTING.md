# Contributing to vue-why-did-you-render

Thank you for your interest in contributing to vue-why-did-you-render! This document provides guidelines and instructions to help you get started.

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to imdarshshah@gmail.com.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [pnpm](https://pnpm.io/) (we use pnpm as the package manager)

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vue-why-did-you-render.git
   cd vue-why-did-you-render
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a new branch for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build the library |
| `pnpm dev` | Build in watch mode |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Run ESLint with auto-fix |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check code formatting |
| `pnpm check` | Run all checks (typecheck + lint + format) |

### Before Submitting

Always run the full check suite before submitting a pull request:

```bash
pnpm check
pnpm test
```

## Making Changes

### Code Style

- We use [ESLint](https://eslint.org/) for linting
- We use [Prettier](https://prettier.io/) for code formatting
- TypeScript is required for all source code
- Follow existing code patterns and conventions

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages. This project is [Commitizen](https://github.com/commitizen/cz-cli) friendly.

**To create a commit:**

```bash
git add -A
pnpm commit
```

This will launch an interactive prompt to help you craft a properly formatted commit message.

**Commit message format:**

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring (no feature or bug fix)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

**Examples:**
```
feat(core): add support for custom formatters
fix(logger): handle undefined component names
docs: update API documentation
test: add integration tests for Pinia tracking
```

## Pull Request Process

1. Ensure your code passes all checks:
   ```bash
   pnpm check
   pnpm test
   ```

2. Update documentation if you've changed APIs or added features

3. Fill out the pull request template completely

4. Link any related issues in your PR description

5. Request a review from a maintainer

### PR Guidelines

- Keep PRs focused and small when possible
- One feature or fix per PR
- Include tests for new functionality
- Update documentation for API changes
- Ensure CI passes before requesting review

## Reporting Bugs

When reporting bugs, please include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Vue version and browser information
- Minimal reproduction code if possible

## Suggesting Features

Feature suggestions are welcome! Please:

1. Check existing issues to avoid duplicates
2. Provide a clear use case
3. Explain the expected behavior
4. Consider implementation implications

## Project Structure

```
vue-why-did-you-render/
├── src/
│   ├── core/           # Core tracking logic
│   ├── logger/         # Logging and formatting
│   └── index.ts        # Main entry point
├── tests/              # Test files
├── examples/           # Example applications
└── dist/               # Built output (generated)
```

## Questions?

If you have questions, feel free to:

- Open a [GitHub Discussion](https://github.com/iamdarshshah/vue-why-did-you-render/discussions)
- Open an issue with the "question" label

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing! 🎉

