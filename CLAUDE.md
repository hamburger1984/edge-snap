# Claude Development Guidelines for EdgySnapper

## Code Quality Standards

### After Each Change
- **Show a short summary** of what was changed and why
- **Test the change** to ensure it works as expected
- **Create a commit** after each successful change with descriptive message

### Development Process
1. **Plan before coding** - Use TodoWrite to track complex tasks
2. **Test incrementally** - Verify each feature works before moving to next
3. **Document decisions** - Add comments for complex logic
4. **Handle errors gracefully** - Always include try/catch blocks
5. **Use consistent formatting** - Follow existing code style

### Commit Message Format
```
type(scope): brief description

- Detailed explanation of changes
- Why the change was needed
- Any side effects or considerations
```

Types: fix, feat, refactor, style, docs, test

## Technical Guidelines

### Camera & Preview
- Always match canvas dimensions to video dimensions
- Handle aspect ratio differences between preview and capture
- Account for potential mirroring in front-facing cameras
- Provide visual indicators for actual capture area

### Edge Detection
- Ensure edge overlay matches the exact capture area
- Handle different aspect ratios between reference and live preview
- Optimize OpenCV operations for performance
- Provide clear visual feedback when edge detection is active

### Storage & Performance
- Compress images appropriately for storage
- Implement proper cleanup for canvas operations
- Use IndexedDB transactions correctly
- Handle storage quota exceeded gracefully

### PWA Requirements
- Test offline functionality
- Ensure proper caching of assets
- Verify installation on mobile devices
- Handle network connectivity changes

## Browser Compatibility
- Test on Chrome, Safari, Firefox
- Verify mobile Safari behavior
- Handle getUserMedia permissions properly
- Test PWA installation flow

## Security & Privacy
- Never log sensitive data
- Store all data locally only
- Respect camera permissions
- Clear sensitive data on app unload

## Testing Checklist
Before marking any feature complete:
- [ ] Works on desktop Chrome
- [ ] Works on mobile Safari
- [ ] Handles errors gracefully
- [ ] Provides user feedback
- [ ] Maintains state correctly
- [ ] Performance is acceptable

## File Organization
- Keep modules focused and single-purpose
- Use consistent naming conventions
- Document public APIs
- Minimize dependencies between modules

## Performance Monitoring
- Monitor memory usage during long sessions
- Profile canvas operations
- Check IndexedDB performance with large datasets
- Test with slow network conditions