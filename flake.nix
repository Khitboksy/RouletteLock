{
  description = "RouletteLock — Deadlock Item Randomizer";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            git
          ];

          shellHook = ''
            echo "RouletteLock dev environment loaded"

            # Auto-install root deps
            if [ ! -d node_modules ]; then
              echo "  Installing root dependencies..."
              bun install
            fi

            # Auto-install frontend deps
            if [ ! -d frontend/node_modules ]; then
              echo "  Installing frontend dependencies..."
              (cd frontend && bun install)
            fi

            # Auto-seed database if missing
            if [ ! -f src/db/roulettelock.db ]; then
              echo "  Seeding database..."
              bun run seed
            fi

            echo "   bun $(bun --version)"
            echo "   Run 'bun run dev' to start developing"
          '';
        };
      }
    );
}
