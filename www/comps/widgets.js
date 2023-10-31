import { getCaption } from './shared/language.js';
import srcBase64Icon  from './shared/image.js';
import MyForm from './form.js';
export {MyWidgets as default};

let MyWidget = {
	name:'my-widget',
	components:{ MyForm },
	template:`<div class="widget" :class="cssClasses">
		<div class="header" :style="headerStyle">
			<img class="dragAnchor" src="images/drag.png" v-if="editMode" />
			
			<span v-if="moduleWidget !== false">
				{{ getCaption(moduleWidget.captions.widgetTitle,'') }}
			</span>
			
			<img class="clickable" src="images/delete.png"
				v-if="editMode && !isTemplate"
				@click="$emit('remove')"
			/>
		</div>
		<div class="content">
			
			<!-- system widget: module menu -->
			<div class="system-module-menu" v-if="moduleEntry !== false">
				
				<router-link class="clickable"
					:to="'/app/'+moduleEntry.name"
				>
					<img :src="srcBase64Icon(moduleEntry.iconId,'images/module.png')" />
					<span>{{ moduleEntry.caption }}</span>
				</router-link>
				
				<div class="children">
					<router-link class="clickable"
						v-for="mec in moduleEntry.children"
						:key="mec.id"
						:to="'/app/'+moduleEntry.name+'/'+mec.name"
					>
						<img :src="srcBase64Icon(mec.iconId,'images/module.png')" />
						<span>{{ mec.caption }}</span>
						
					</router-link>
				</div>
				
				<img class="watermark" :src="srcBase64Icon(moduleEntry.iconId,'images/module.png')" />
			</div>
			
			<!-- system widget: login details -->
			
			<!-- form -->
			<my-form
				v-if="form !== false"
				:formId="form.id"
				:isWidget="true"
				:moduleId="form.moduleId"
				:recordIds="[]"
			/>
			
			<!-- collection -->
		</div>
	</div>`,
	emits:['remove'],
	props:{
		editMode:  { type:Boolean, required:true },
		isTemplate:{ type:Boolean, required:false, default:false },
		widget:    { type:Object,  required:true }
	},
	computed:{
		cssClasses:(s) => {
			let out = [];
			
			if(s.isTemplate)                              out.push('template');
			if(s.moduleWidget && s.moduleWidget.size > 1) out.push('size2');
			
			return out.join(' ');
		},
		icon:(s) => {
			
		},
		title:(s) => {
			// use most specific title in order: Widget title, form title, collection title, widget name
			let t = '';
			if(s.moduleWidget !== false)
				t = s.getCaption(s.moduleWidget.captions.widgetTitle,'');
			
			if(t === '' && s.form !== false)
				t = s.getCaption(s.form.captions.formTitle, '');
			
			if(t === '' && s.collection !== false)
				t = s.getCaption(s.collection.captions.collectionTitle, '');
			
			if(t === '')
				t = s.moduleWidget.name;
			
			return t;
		},
		
		// simple
		headerStyle:(s) => s.moduleEntry !== false ? s.moduleEntry.styleBg : '',
		isSystem:   (s) => s.widget.content.startsWith('system'),
		
		// entities
		collection:  (s) => s.moduleWidget === false || s.moduleWidget.collectionId === null ? false : s.collectionIdMap[s.moduleWidget.collectionId],
		form:        (s) => s.moduleWidget === false || s.moduleWidget.formId       === null ? false : s.formIdMap[s.moduleWidget.formId],
		moduleWidget:(s) => s.widget.widgetId === null ? false : s.widgetIdMap[s.widget.widgetId],
		moduleEntry: (s) => {
			if(s.widget.content !== 'systemModuleMenu')
				return false;
			
			for(const me of s.moduleEntries) {
				if(me.id === s.widget.moduleId)
					return me;
			}
			return false;
		},
		
		// stores
		collectionIdMap:(s) => s.$store.getters['schema/collectionIdMap'],
		formIdMap:      (s) => s.$store.getters['schema/formIdMap'],
		widgetIdMap:    (s) => s.$store.getters['schema/widgetIdMap'],
		moduleEntries:  (s) => s.$store.getters.moduleEntries
	},
	mounted() {
	},
	methods:{
		// externals
		getCaption,
		srcBase64Icon
	}
};

let MyWidgetGroup = {
	name:'my-widget-group',
	components:{ MyWidget },
	template:`<div class="widget-group" :class="{ editMode:editMode }">
		<div class="widget-group-title default-inputs">
			<img class="dragAnchor" src="images/drag.png" v-if="editMode" />
			<span v-if="!editMode">{{ widgetGroup.title }}</span>
			<input v-if="editMode" @input="$emit('set-title',$event.target.value)" :value="widgetGroup.title" />
			<my-button image="delete.png"
				v-if="editMode"
				@trigger="$emit('remove')"
				:naked="true"
			/>
		</div>
		
		<draggable class="widget-group-items" handle=".dragAnchor" group="widget-group-items" itemKey="id" animation="150"
			:list="widgetGroup.items"
		>
			<template #item="{element,index}">
				<my-widget
					@remove="$emit('remove-widget',index)"
					:editMode="editMode"
					:widget="element"
				/>
			</template>
			<template #footer v-if="editMode && widgetGroup.items.length === 0">
				<div class="widget placeholder">
					{{ capApp.placeholder }}
				</div>
			</template>
		</draggable>
	</div>`,
	emits:['remove','remove-widget','set-title'],
	props:{
		editMode:   { type:Boolean, required:true },
		widgetGroup:{ type:Object,  required:true }
	},
	computed:{
		// stores
		capApp:(s) => s.$store.getters.captions.widgets
	}
};

let MyWidgets = {
	name:'my-widgets',
	components:{
		MyWidget,
		MyWidgetGroup
	},
	template:`<div class="widgets">
		<div class="widgets-content-wrap">
			<div class="widgets-content"
				:class="{ editMode:editMode }"
				:style="'max-width:' + widgetWidth + 'px'"
			>
				<draggable class="widget-groups" handle=".dragAnchor" group="widget-groups" itemKey="id" animation="150" direction="vertical"
					:class="{ editMode:editMode, flowsAsRow:widgetFlow === 'row' }"
					:list="widgetGroupsInput"
				>
					<template #item="{element,index}">
						<my-widget-group
							@remove="groupDel(index)"
							@remove-widget="widgetDel(index,$event)"
							@set-title="groupSetTitle(index,$event)"
							:editMode="editMode"
							:widgetGroup="element"
						/>
					</template>
				</draggable>
			</div>
		</div>
		
		<div class="widgets-sidebar" :class="{ shown:editMode }" v-if="!isMobile">
			<div class="row gap">
				<my-button image="edit.png"
					v-if="!editMode"
					@trigger="openEditMode"
					:caption="capGen.button.edit"
				/>
				<my-button image="save.png"
					v-if="editMode"
					@trigger="set"
					:active="hasChanges"
					:caption="capGen.button.save"
				/>
				<my-button image="refresh.png"
					v-if="editMode"
					@trigger="reset"
					:active="hasChanges"
					:caption="capGen.button.refresh"
				/>
				<my-button image="add.png"
					v-if="editMode"
					@trigger="groupAdd"
					:caption="capApp.button.groupAdd"
				/>
				<my-button image="cancel.png"
					v-if="editMode"
					@trigger="editMode = !editMode"
					:caption="capGen.button.close"
					:cancel="true"
				/>
			</div>
			
			<div class="widgets-sidebar-content" v-if="editMode">
				<h2>{{ capGen.settings }}</h2>
				<div class="container default-inputs">
					<table>
						<tr>
							<td>{{ capApp.flow }}</td>
							<td>
								<select v-model="flowInput">
									<option value="column">{{ capApp.option.flowColumn }}</option>
									<option value="row">{{ capApp.option.flowRow }}</option>
								</select>
							</td>
						</tr>
						<tr>
							<td>{{ capApp.width }}</td>
							<td>
								<div class="row centered gap">
									<my-button image="remove.png" @trigger="widthInput -= widthSteps" :active="widthInput > widthSteps" />
									<input disabled="disabled" :value="widthInput" />
									<my-button image="add.png" @trigger="widthInput += widthSteps" />
								</div>
							</td>
						</tr>
					</table>
				</div>
			</div>
			
			<div class="widgets-sidebar-content shrinks" v-if="editMode">
				<h2>{{ capGen.available }}</h2>
				<draggable class="widget-group-items container" handle=".dragAnchor" itemKey="id" animation="150"
					:group="{ name:'widget-group-items', put:false }"
					:list="widgetTemplates"
				>
					<template #item="{element,index}">
						<my-widget
							:editMode="editMode"
							:isTemplate="true"
							:widget="element"
						/>
					</template>
				</draggable>
			</div>
		</div>
	</div>`,
	data() {
		return {
			editMode:false,
			widgetGroupsInput:[], // widget groups, updated by user input
			widthSteps:50
		};
	},
	computed:{
		moduleIdsAccessible:(s) => {
			let out = [];
			for(const me of s.moduleEntries) {
				out.push(me.id);
			}
			return out;
		},
		moduleIdsUsedMenu:(s) => {
			let out = [];
			for(const g of s.widgetGroupsInput) {
				for(const w of g.items) {
					if(w.moduleId !== null)
						out.push(w.moduleId);
				}
			}
			return out;
		},
		widgetIdsUsed:(s) => {
			let out = [];
			for(const g of s.widgetGroupsInput) {
				for(const w of g.items) {
					if(w.widgetId !== null)
						out.push(w.widgetId);
				}
			}
			return out;
		},
		widgetTemplates:(s) => {
			let out = [];
			
			// system widget: login details
			out.push({
				content:'systemLoginDetails',
				moduleId:null,
				widgetId:null
			});
			
			// system widget: module menu
			for(const m of s.modules) {
				if(!s.moduleIdsAccessible.includes(m.id) || s.moduleIdsUsedMenu.includes(m.id))
					continue;
				
				out.push({
					content:'systemModuleMenu',
					moduleId:m.id,
					widgetId:null
				});
			}
			
			// module widgets
			for(const m of s.modules) {
				for(const w of m.widgets) {
					if(s.widgetIdsUsed.includes(w.id))
						continue;
					
					out.push({
						content:'moduleWidget',
						moduleId:null,
						widgetId:w.id
					});
				}
			}
			return out;
		},
		
		// inputs
		flowInput:{
			get()  { return this.widgetFlow; },
			set(v) { this.$store.commit('local/widgetFlow',v); }
		},
		widthInput:{
			get()  { return this.widgetWidth; },
			set(v) { this.$store.commit('local/widgetWidth',v); }
		},
		
		// simple
		hasChanges:(s) => JSON.stringify(s.widgetGroups) !== JSON.stringify(s.widgetGroupsInput),
		
		// stores
		widgetFlow:   (s) => s.$store.getters['local/widgetFlow'],
		widgetWidth:  (s) => s.$store.getters['local/widgetWidth'],
		modules:      (s) => s.$store.getters['schema/modules'],
		capApp:       (s) => s.$store.getters.captions.widgets,
		capGen:       (s) => s.$store.getters.captions.generic,
		isMobile:     (s) => s.$store.getters.isMobile,
		moduleEntries:(s) => s.$store.getters.moduleEntries,
		widgetGroups: (s) => s.$store.getters.loginWidgetGroups
	},
	mounted() {
		this.reset();
	},
	methods:{
		reset() {
			this.widgetGroupsInput = JSON.parse(JSON.stringify(this.widgetGroups));
		},
		
		// actions
		groupAdd() {
			this.widgetGroupsInput.push({
				title:this.capApp.groupNameNew,
				items:[]
			});
		},
		groupDel(index) {
			this.widgetGroupsInput.splice(index,1);
		},
		groupSetTitle(index,value) {
			this.widgetGroupsInput[index].title = value;
		},
		openEditMode() {
			if(this.widgetGroupsInput.length === 0)
				this.groupAdd();
			
			this.editMode = true;
		},
		widgetDel(groupIndex,widgetIndex) {
			this.widgetGroupsInput[groupIndex].items.splice(widgetIndex,1);
		},
		
		// backend calls
		set() {
			ws.send('loginWidgetGroups','set',this.widgetGroupsInput,true).then(
				res => {
					this.$store.commit('loginWidgetGroups',this.widgetGroupsInput);
					this.reset();
				},
				this.genericError
			);
		}
	}
};