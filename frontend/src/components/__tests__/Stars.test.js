/**
 * Tests for src/components/stars/Stars.jsx
 *
 * Run: npm test
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import Stars from "../stars/Stars";

// Mock lucide-react to avoid SVG rendering issues in jsdom
jest.mock("lucide-react", () => ({
  Star: ({ fill, "aria-hidden": ariaHidden }) => (
    <svg data-testid="star-icon" data-fill={fill} aria-hidden={ariaHidden} />
  ),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderStars(rating, count) {
  return render(<Stars rating={rating} count={count} />);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Stars component", () => {
  it("always renders exactly 5 star icons", () => {
    renderStars(3);
    expect(screen.getAllByTestId("star-icon")).toHaveLength(5);
  });

  it("has an aria-label describing the rating", () => {
    renderStars(4);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "4 out of 5 stars"
    );
  });

  it("shows 0 stars for a zero rating", () => {
    renderStars(0);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "0 out of 5 stars"
    );
  });

  it("shows 0 stars when rating is undefined", () => {
    renderStars(undefined);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "0 out of 5 stars"
    );
  });

  it("rounds a fractional rating to the nearest integer", () => {
    // 2.7 → rounds to 3
    renderStars(2.7);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "3 out of 5 stars"
    );
  });

  it("rounds 2.4 down to 2", () => {
    renderStars(2.4);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "2 out of 5 stars"
    );
  });

  it("clamps a 5-star rating correctly", () => {
    renderStars(5);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "5 out of 5 stars"
    );
  });

  it("displays the count when provided", () => {
    renderStars(3, 42);
    expect(screen.getByText("(42)")).toBeInTheDocument();
  });

  it("hides the count when not provided", () => {
    renderStars(3);
    expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
  });

  it("displays count of 0 when explicitly passed", () => {
    renderStars(4, 0);
    expect(screen.getByText("(0)")).toBeInTheDocument();
  });
});
