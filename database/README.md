# Database

SrijanSetu uses PostgreSQL. The backend owns database access through SQLAlchemy models and Alembic migrations, while this folder documents the database shape for planning and deployment.

## Core Tables

- `users`: customers, creators, and admins with auth, username, activity, and login metadata
- `creator_profiles`: creator-specific brand, headline, portfolio, social links, rating, response, and verification metadata
- `creator_categories`: categories each creator can work in
- `creator_portfolio_photos`: up to four artwork photos shown on creator profiles
- `requirements`: custom product ideas posted by customers
- `requirement_references`: uploaded images/design references for a requirement
- `quotations`: creator responses with price and timeline
- `orders`: accepted quotations with commission split
- `order_files`: work updates, previews, and final delivery files
- `messages`: order-level customer and creator chat
- `payments`: Razorpay transaction references and payment state
- `reviews`: customer ratings for completed work
- `notifications`: user notifications
- `saved_creators`: customer saved/favorite creators
- `ai_generations`: future AI prompt and generated image tracking
- `ad_placements`: controlled ad metadata for homepage/feed slots

## Migration Source

The executable migration files live in `backend/alembic/versions` because they import backend SQLAlchemy metadata.
