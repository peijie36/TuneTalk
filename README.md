<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a name="readme-top"></a>
<!--
*** Thanks for checking out the Best-README-Template. If you have a suggestion
*** that would make this better, please fork the repo and create a pull request
*** or simply open an issue with the tag "enhancement".
*** Don't forget to give the project a star!
*** Thanks again! Now go create something AMAZING! :D
-->

<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]
[![GitHub][github-shield]][github-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/peijie36/TuneTalk">
    <h3 align="center">TuneTalk</h3>
  </a>

  <p align="center">
    A realtime social listening platform for shared music rooms with synced playback, live chat, presence, and Audius-powered queues.
    <br />
    <a href="https://github.com/peijie36/TuneTalk"><strong>Explore the repository &gt;&gt;</strong></a>
    <br />
    <br />
    <a href="./apps/web">Web App</a>
    |
    <a href="./apps/api">API</a>
    |
    <a href="https://github.com/peijie36/TuneTalk/issues">Report Bug</a>
    |
    <a href="https://github.com/peijie36/TuneTalk/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

TuneTalk is a Turborepo monorepo for a collaborative listening experience. The web app lets users discover rooms, create public or private sessions, join friends, queue tracks, and chat in realtime. The API handles authentication, room lifecycle, playback updates, queue mutations, and WebSocket fan-out, while Postgres persists users, memberships, messages, and playback state.

Here's why:
* Create public or password-protected rooms with clear host and member roles.
* Keep queue, playback, chat, and presence synchronized through a dedicated Hono WebSocket channel.
* Share TypeScript contracts and database code across apps so the stack stays consistent.

The current implementation uses Better Auth for sign-in, Drizzle ORM for schema access, PostgreSQL for persistence, and Audius as the music provider.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [Next.js](https://nextjs.org/)
* [React](https://react.dev/)
* [Tailwind CSS](https://tailwindcss.com/)
* [Hono](https://hono.dev/)
* [Better Auth](https://www.better-auth.com/)
* [Drizzle ORM](https://orm.drizzle.team/)
* [PostgreSQL](https://www.postgresql.org/)
* [Turborepo](https://turbo.build/repo)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

To run TuneTalk locally, you need a PostgreSQL database plus the environment variables consumed by the web app, API, and database package.

### Prerequisites

* Node.js `20.11+`
* `pnpm` `10.21+`
* PostgreSQL
* An Audius API key if you want track search and streaming enabled locally

Example `pnpm` install:
```sh
npm install -g pnpm
```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/peijie36/TuneTalk.git
   ```
2. Install workspace dependencies
   ```sh
   pnpm install
   ```
3. Copy `env.example` to `.env` and populate the required values
   ```env
   DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/tunetalk
   BETTER_AUTH_SECRET=replace-with-a-long-random-secret
   BETTER_AUTH_URL=http://localhost:8787
   WEB_ORIGIN=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:8787
   AUDIUS_API_KEY=your-audius-api-key
   ```
4. Run the existing Drizzle migrations
   ```sh
   pnpm --filter @tunetalk/db db:migrate
   ```
5. Start the API in one terminal
   ```sh
   pnpm dev:api
   ```
6. Start the web app in another terminal
   ```sh
   pnpm dev:web
   ```
7. Open the app at `http://localhost:3000`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

TuneTalk is organized around hosted listening rooms. A typical local flow looks like this:

1. Create an account or sign in.
2. Open Discover to browse public and private rooms.
3. Create a room, invite others, or join an existing session.
4. Search Audius tracks and add them to the shared queue.
5. Let the host control playback while chat, presence, and queue state stay in sync in realtime.

Helpful workspace scripts:

* `pnpm dev` - alias for the web app
* `pnpm dev:web` - run `apps/web`
* `pnpm dev:api` - run `apps/api`
* `pnpm build` - run the Turborepo build pipeline
* `pnpm lint` - lint all workspace packages
* `pnpm format` - format supported files with Prettier
* `pnpm drizzle-studio` - open Drizzle Studio for the database package

Useful API endpoints during local development:

* `GET /health` - liveness check
* `GET /ready` - database readiness check
* `GET /api/me` - current authenticated session
* `GET|POST /api/auth/*` - Better Auth handlers

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

* [x] Public and private room discovery and join flows
* [x] Realtime queue management, playback sync, chat, and presence
* [x] Better Auth and PostgreSQL-backed persistence
* [ ] Additional music providers beyond Audius
* [ ] Production deployment and observability hardening
* [ ] Richer moderation and collaboration tools for rooms

See the [open issues](https://github.com/peijie36/TuneTalk/issues) for a full list of proposed features and known bugs.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such a useful place to learn, build, and share. Any contributions you make are appreciated.

If you have a suggestion that would improve TuneTalk, fork the repo and create a pull request. You can also open an issue with the tag `enhancement`.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

This repository does not currently include a published license file. Add a project license before redistributing the code outside GitHub's default terms.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Peijie Zheng

GitHub: [@peijie36](https://github.com/peijie36)

Project Link: [https://github.com/peijie36/TuneTalk](https://github.com/peijie36/TuneTalk)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Best README Template](https://github.com/othneildrew/Best-README-Template)
* [Audius API](https://docs.audius.org/)
* [Better Auth](https://www.better-auth.com/)
* [Hono](https://hono.dev/)
* [Drizzle ORM](https://orm.drizzle.team/)
* [shadcn/ui](https://ui.shadcn.com/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/peijie36/TuneTalk.svg?style=for-the-badge
[contributors-url]: https://github.com/peijie36/TuneTalk/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/peijie36/TuneTalk.svg?style=for-the-badge
[forks-url]: https://github.com/peijie36/TuneTalk/network/members
[stars-shield]: https://img.shields.io/github/stars/peijie36/TuneTalk.svg?style=for-the-badge
[stars-url]: https://github.com/peijie36/TuneTalk/stargazers
[issues-shield]: https://img.shields.io/github/issues/peijie36/TuneTalk.svg?style=for-the-badge
[issues-url]: https://github.com/peijie36/TuneTalk/issues
[license-shield]: https://img.shields.io/badge/License-Not%20specified-lightgrey.svg?style=for-the-badge
[license-url]: https://github.com/peijie36/TuneTalk#license
[github-shield]: https://img.shields.io/badge/GitHub-peijie36-181717?style=for-the-badge&logo=github&logoColor=white
[github-url]: https://github.com/peijie36
