# Backend module convention

Keep each business domain self-contained. A typical module may contain:
- `*.routes.js` – URL definitions only
- `*.controller.js` – HTTP request/response handling
- `*.service.js` – business rules
- `*.model.js` – Mongoose schema/model
- `*.validation.js` – request validation
- `*.repository.js` – database access when useful
- `*.constants.js` – module-specific constants

Do not put all business logic in controllers. Do not let one module directly depend on another module's database model where a service/API boundary is more appropriate.
