# Template Management System

## Overview

The Template Management System provides a structured way for suppliers to submit product information through WhatsApp by following predefined templates. This system improves data quality, reduces extraction errors, and provides better guidance to suppliers.

## Features

### 1. Template Creation and Management

Administrators can create templates with:
- **Basic Information**: Name, description, type (text/image/PDF/mixed), category
- **Custom Fields**: Define required and optional fields with validation rules
- **Example Content**: Provide sample submissions for suppliers
- **Instructions**: Add detailed guidance for suppliers
- **Scope**: Global templates (all suppliers) or supplier-specific templates
- **Versioning**: Automatic version tracking when templates are updated

### 2. Template Validation

The system validates supplier submissions against template requirements:
- **Field Validation**: Check required fields, data types, and formats
- **Pattern Matching**: Validate text fields against regex patterns
- **Range Validation**: Ensure numeric values are within acceptable ranges
- **Select Options**: Validate that selected values are from allowed options
- **Detailed Feedback**: Provide specific error messages for validation failures

### 3. Template Analytics

Track template performance and usage:
- **Usage Statistics**: Total uses, success rate, average confidence score
- **Common Errors**: Identify frequently occurring validation errors
- **Processing Time**: Monitor average processing time per template
- **Recent Submissions**: View recent supplier submissions using the template
- **Success Rate**: Track percentage of successful submissions

### 4. Template Improvements (NEW)

Automated analysis and improvement suggestions:
- **Pattern Analysis**: Analyze submission patterns to identify issues
- **Error Analysis**: Identify fields with high error rates
- **Field Usage Analysis**: Detect rarely used optional fields
- **Validation Analysis**: Identify overly restrictive validation rules
- **Automated Suggestions**: Generate actionable improvement recommendations
- **Priority Ranking**: Improvements ranked by priority (high/medium/low)
- **One-Click Apply**: Apply suggested improvements with a single click
- **Health Scoring**: Overall template health assessment (excellent/good/needs improvement/poor)

### 5. Template Notifications (NEW)

Automated notifications for template updates:
- **Update Notifications**: Notify affected suppliers when templates are updated
- **Migration Guidance**: Provide step-by-step guidance for template changes
- **Template Recommendations**: Suggest appropriate templates to suppliers
- **Validation Feedback**: Send feedback to suppliers about submission issues
- **Audit Trail**: Complete logging of all notifications sent

### 6. Template Customization

Flexible template management:
- **Clone Templates**: Create customized versions of existing templates
- **Supplier-Specific**: Create templates for individual suppliers
- **Global Templates**: Share templates across all suppliers
- **Tags**: Organize templates with custom tags
- **Search & Filter**: Find templates by type, category, status, or search term

## API Endpoints

### Template CRUD Operations

- `POST /api/suppliers/templates` - Create a new template
- `GET /api/suppliers/templates` - List all templates with filters
- `GET /api/suppliers/templates/:id` - Get template details
- `PATCH /api/suppliers/templates/:id` - Update a template
- `DELETE /api/suppliers/templates/:id` - Delete a template

### Template Validation

- `POST /api/suppliers/templates/:id/validate` - Validate submission data
- `POST /api/suppliers/templates/:id/usage` - Record template usage
- `GET /api/suppliers/templates/:id/analytics` - Get template analytics

### Template Improvements (NEW)

- `GET /api/suppliers/templates/:id/analysis` - Analyze template and get improvement suggestions
- `GET /api/suppliers/templates/analysis/all` - Analyze all active templates
- `POST /api/suppliers/templates/:id/improvements/apply` - Apply a suggested improvement

### Template Notifications (NEW)

- `POST /api/suppliers/templates/:id/notify-update` - Send update notifications to affected suppliers
- `POST /api/suppliers/:id/template-recommendation` - Send template recommendation to a supplier
- `POST /api/suppliers/:id/validation-feedback` - Send validation feedback to a supplier

### Template Recommendations

- `POST /api/suppliers/templates/recommendations` - Get recommended templates for a supplier
- `GET /api/suppliers/:id/templates` - Get templates available to a supplier
- `POST /api/suppliers/templates/:id/clone` - Clone a template for customization

## Usage Examples

### Creating a Template

```typescript
const template = {
  name: "Electronics Product Submission",
  description: "Template for submitting electronics products",
  type: "text",
  category: "electronics",
  fields: [
    {
      name: "productName",
      label: "Product Name",
      type: "text",
      required: true,
      placeholder: "e.g., iPhone 13 Pro"
    },
    {
      name: "price",
      label: "Price",
      type: "number",
      required: true,
      validation: {
        min: 0,
        max: 1000000
      }
    },
    {
      name: "condition",
      label: "Condition",
      type: "select",
      required: true,
      options: ["new", "used", "refurbished"]
    }
  ],
  exampleContent: "Product: iPhone 13 Pro\nPrice: 50000\nCondition: new",
  instructions: "Please provide all required fields in the format shown in the example.",
  isGlobal: true,
  tags: ["electronics", "phones"]
};
```

### Validating a Submission

```typescript
const validation = await fetch('/api/suppliers/templates/:id/validate', {
  method: 'POST',
  body: JSON.stringify({
    templateId: 'template-uuid',
    submissionData: {
      productName: "iPhone 13 Pro",
      price: 50000,
      condition: "new"
    }
  })
});

const result = await validation.json();
// {
//   isValid: true,
//   errors: [],
//   missingFields: [],
//   validFields: ["productName", "price", "condition"]
// }
```

### Analyzing Template Performance (NEW)

```typescript
const analysis = await fetch('/api/suppliers/templates/:id/analysis');
const result = await analysis.json();
// {
//   templateId: "uuid",
//   templateName: "Electronics Product Submission",
//   totalSubmissions: 150,
//   successRate: 0.85,
//   overallHealth: "good",
//   improvements: [
//     {
//       type: "instruction_clarification",
//       priority: "high",
//       description: "Field 'price' is frequently missing",
//       reasoning: "25% of submissions are missing this required field",
//       suggestedChange: {
//         action: "add_instruction",
//         field: "price",
//         instruction: "Please ensure you always provide the Price. This is a required field."
//       }
//     }
//   ]
// }
```

### Applying Improvements (NEW)

```typescript
const improvement = {
  type: "instruction_clarification",
  priority: "high",
  description: "Field 'price' is frequently missing",
  suggestedChange: {
    action: "add_instruction",
    field: "price",
    instruction: "Please ensure you always provide the Price."
  }
};

await fetch('/api/suppliers/templates/:id/improvements/apply', {
  method: 'POST',
  body: JSON.stringify(improvement)
});
```

## Frontend Components

### TemplateForm

Component for creating and editing templates with:
- Field builder with drag-and-drop support
- Validation rule configuration
- Example content editor
- Tag management
- Real-time validation

### TemplateValidator

Component for testing template validation:
- Interactive form based on template fields
- Real-time validation feedback
- Error highlighting
- Validation result display

### TemplateImprovements (NEW)

Component for viewing and applying template improvements:
- Template health dashboard
- Prioritized improvement suggestions
- Supporting data visualization
- One-click improvement application
- Manual review options

## Best Practices

1. **Start Simple**: Begin with basic templates and add complexity as needed
2. **Clear Instructions**: Provide detailed instructions and examples
3. **Reasonable Validation**: Don't make validation rules too restrictive
4. **Regular Analysis**: Review template analytics regularly to identify issues
5. **Apply Improvements**: Act on automated improvement suggestions
6. **Test Thoroughly**: Use the validator to test templates before deployment
7. **Version Control**: Track template versions and notify suppliers of changes
8. **Monitor Health**: Keep templates in "good" or "excellent" health status
9. **Supplier Feedback**: Collect and act on supplier feedback
10. **Iterate**: Continuously improve templates based on usage patterns

## Troubleshooting

### High Error Rates

If a template has a high error rate:
1. Check the "Improvements" tab for automated suggestions
2. Review common errors in the analytics
3. Consider relaxing validation rules
4. Add clearer instructions or examples
5. Apply suggested improvements

### Low Usage

If a template is rarely used:
1. Check if it's properly tagged and categorized
2. Ensure it's marked as active
3. Send template recommendations to relevant suppliers
4. Review if the template is too complex

### Validation Issues

If validation is failing unexpectedly:
1. Test the template using the validator
2. Check validation rules for each field
3. Review error messages for clarity
4. Consider adding format examples

## Future Enhancements

- Machine learning-based template suggestions
- A/B testing for template variations
- Multi-language template support
- Template marketplace for sharing
- Advanced analytics and reporting
- Integration with AI extraction improvements 