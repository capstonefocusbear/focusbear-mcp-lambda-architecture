# Linked Activity Template ID

Activities can be linked to each other so that they'll share stats. This feature is available in habit packs so authors can link the template activities in  
habit packs which means that when the user installs the habit pack these activities will be linked and ready to use.

## Linking installed templates

In the `installRoutineHabitPack` function three maps are created to keep track of the new IDs assigned to:

- template activities
- choices
- log quantity questions

After new items have been created from the templates, each item is checked to see if it was linked to another template.  
If it was linked, the respective IDs map is checked to find the linked item's new ID, and the item is updated to be linked to the newly created item  
A new field `linked_activity_id` is added to the activity or choice which stores the ID of the activity or choice they are linked to, and the activity's `linked_activity_template_id` property is deleted. Log quantity questions have a field `linked_question_id` which references the question they are linked to.
