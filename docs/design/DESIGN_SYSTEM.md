# FlowVision Design System

## Design Principles

### 1. Consistency

- Use standardized components and patterns across all features
- Maintain visual hierarchy through typography and spacing
- Apply consistent interaction patterns for similar functions

### 2. Clarity

- Clear information architecture with 4-phase workflow
- Professional blue color scheme with high contrast
- Clean card-based design language

### 3. Efficiency

- Minimize cognitive load for SMB leaders
- Streamlined forms and workflows
- Responsive design for all devices

## Typography Scale

```css
.text-h1     /* 3xl, font-bold - Page titles */
.text-h2     /* 2xl, font-semibold - Section headings */
.text-h3     /* xl, font-medium - Subsection headings */
.text-body   /* base - Regular content */
.text-caption /* sm, text-gray-600 - Supporting text */
```

## Color System

### Primary Colors

- **Primary Blue**: `#2563EB` - Actions, links, active states
- **Success Green**: `#059669` - Completed, approved states
- **Warning Orange**: `#D97706` - In progress, attention needed
- **Danger Red**: `#DC2626` - Errors, critical issues

### Neutral Grays

- **Gray 50**: `#F9FAFB` - Background
- **Gray 100**: `#F3F4F6` - Card backgrounds
- **Gray 600**: `#4B5563` - Secondary text
- **Gray 900**: `#111827` - Primary text

## Component Library

### Buttons

```css
.btn-primary   /* Primary actions - blue background */
.btn-secondary /* Secondary actions - gray background */
.btn-danger    /* Destructive actions - red background */
```

**Usage Guidelines:**

- Primary: Main call-to-action (Create, Submit, Save)
- Secondary: Cancel, secondary options, navigation
- Danger: Delete, remove, destructive actions

### Cards

```css
.card-primary   /* Main content cards - elevated shadow */
.card-secondary /* Secondary content - subtle shadow */
.card-tertiary  /* Minimal cards - light shadow */
```

**Usage Guidelines:**

- Primary: Forms, detailed content, modals
- Secondary: List items, content blocks
- Tertiary: Metrics, stats, minimal info

### Form Elements

```css
.input-field    /* Text inputs - consistent styling */
.textarea-field /* Text areas - resizable */
.form-select    /* Dropdowns - consistent styling */
```

**Standard Form Pattern:**

```tsx
<div className="form-card">
  <h2 className="form-header">Form Title</h2>
  <form className="form-group">
    <FormField label="Title" value={title} onChange={setTitle} required />
    <div className="form-actions">
      <button type="button" className="btn-secondary">
        Cancel
      </button>
      <button type="submit" className="btn-primary">
        Submit
      </button>
    </div>
  </form>
</div>
```

### Status Indicators

```css
.status-badge     /* Base badge styling */
.status-done      /* Green - completed */
.status-in-progress /* Blue - active */
.status-prioritize  /* Orange - needs attention */
.status-define      /* Gray - draft/planning */
```

### Priority Indicators

```css
.priority-critical /* Red - urgent */
.priority-high     /* Orange - important */
.priority-medium   /* Yellow - moderate */
.priority-low      /* Green - low priority */
```

## Layout Patterns

### Page Structure

```tsx
<div className="space-y-8 animate-fade-in">
  {/* Header Section */}
  <div className="text-center">
    <h1 className="text-h1 mb-4">Page Title</h1>
    <p className="text-body max-w-2xl mx-auto">Description</p>
  </div>

  {/* Content Cards */}
  <div className="card-primary p-6 max-w-4xl mx-auto">{/* Form or content */}</div>
</div>
```

### Form Layouts

#### Inline Form (Quick Actions)

- Used for: Initiative creation, issue submission
- Pattern: Horizontal layout, minimal fields
- Container: Direct on page or light card

#### Modal Form (Detailed Creation)

- Used for: Requirement cards, complex entities
- Pattern: Vertical layout, comprehensive fields
- Container: Modal overlay with FormModal component

#### Full Page Form (Detailed Editing)

- Used for: Initiative details, user profiles
- Pattern: Full page with breadcrumbs
- Container: Centered card with navigation

## Component Usage Guidelines

### When to Use Each Pattern

**Inline Forms:**

- Quick creation (3 fields or less)
- High-frequency actions
- Non-critical data entry

**Modal Forms:**

- Detailed creation (4+ fields)
- Complex validation requirements
- Interrupting current workflow is acceptable

**Full Page Forms:**

- Editing existing entities
- Complex multi-section forms
- When context switching is natural

### Consistent Interaction Patterns

**Creating Entities:**

1. Use consistent "Add New [Entity]" button text
2. Apply form validation with helpful error messages
3. Show success confirmation after creation
4. Redirect to appropriate next step

**Editing Entities:**

1. Pre-populate forms with existing data
2. Use "Save Changes" for button text
3. Show saving state during submission
4. Provide clear feedback on success/failure

**Deleting Entities:**

1. Use danger button styling
2. Require confirmation for destructive actions
3. Provide undo functionality when possible
4. Show clear feedback after deletion

## Animation and Transitions

```css
.animate-fade-in   /* Page entry animation */
.animate-slide-up  /* Element reveal animation */
```

**Usage:**

- Apply fade-in to page containers
- Use slide-up for revealing content
- Keep animations subtle and fast (200-300ms)

## Responsive Design

### Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Patterns

- Mobile-first design approach
- Collapsible navigation on mobile
- Stacked form layouts on small screens
- Responsive grid layouts (1 col mobile, 2-3 cols desktop)

## Accessibility

### Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast ratios (4.5:1 minimum)

### Implementation

- Semantic HTML structure
- Proper ARIA labels
- Focus management in modals
- Skip navigation links

## Examples

### Good Pattern: Issue Creation Form

```tsx
<div className="form-card max-w-2xl mx-auto">
  <h2 className="form-header">Report New Issue</h2>
  <form onSubmit={handleSubmit} className="form-group">
    <FormField
      label="Issue Description"
      type="textarea"
      value={description}
      onChange={setDescription}
      required
    />
    <div className="form-actions">
      <button type="submit" className="btn-primary">
        Submit Issue
      </button>
    </div>
  </form>
</div>
```

### Good Pattern: Entity List with Actions

```tsx
<div className="space-y-4">
  {entities.map((entity) => (
    <div key={entity.id} className="card-secondary p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-h3">{entity.title}</h3>
          <p className="text-caption">{entity.description}</p>
        </div>
        <div className="flex space-x-2">
          <button className="btn-secondary text-sm">Edit</button>
          <button className="btn-danger text-sm">Delete</button>
        </div>
      </div>
    </div>
  ))}
</div>
```

## Anti-Patterns to Avoid

❌ **Inconsistent button sizing** - Mix of custom padding vs standard classes
❌ **Multiple form input class names** - input-field vs form-input vs custom classes  
❌ **Inconsistent modal patterns** - Some entities use modals, others use inline forms
❌ **Missing visual hierarchy** - Inconsistent heading usage
❌ **Custom styling without system classes** - Inline styles or one-off CSS

## Future Considerations

### Planned Enhancements

- Dark mode support
- Component library documentation
- Figma design system integration
- Automated design token validation

### Migration Path

1. ✅ Standardize CSS classes and form patterns
2. ✅ Create reusable modal and form components
3. 🔄 Update existing pages to use standard patterns
4. ⏳ Create comprehensive component documentation
5. ⏳ Implement design system governance tools
