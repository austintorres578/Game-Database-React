// Pure password validation for the sign-up form.

/**
 * Returns a list of unmet password requirements for the given string.
 * An empty array means the password passes all rules.
 *
 * Rules:
 *  - At least 8 characters
 *  - At least one uppercase letter
 *  - At least one number
 *  - At least one special character (!@#$%^&*)
 *
 * @param {string} pwd
 * @returns {string[]}
 */
export function getPasswordIssues(pwd) {
  const issues = [];
  if (pwd.length < 8)
    issues.push("Password must be at least 8 characters long.");
  if (!/[A-Z]/.test(pwd))
    issues.push("Password must include at least one uppercase letter.");
  if (!/[0-9]/.test(pwd))
    issues.push("Password must include at least one number.");
  if (!/[!@#$%^&*]/.test(pwd))
    issues.push("Password must include at least one special character (!@#$%^&*).");
  return issues;
}
